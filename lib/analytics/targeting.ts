/**
 * The scoring contract behind `/admin/customer-trends`.
 *
 * Everything here is arithmetic over real order rows. There is no model, no
 * training and no estimate: "opportunity", "confidence" and "cluster" are named
 * formulas a marketer can audit, and each is documented where it is defined so
 * a number on the screen can always be traced back to orders that exist.
 */

/* ── Contract ────────────────────────────────────────────────────────── */

export type ClusterKey = 'scale' | 'defend' | 'test' | 'watch';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type CampaignObjective = 'conversion' | 'retention' | 'prospecting' | 'awareness';

export const CLUSTER_KEYS: readonly ClusterKey[] = ['scale', 'defend', 'test', 'watch'];

/** Periods the UI offers. Anything else is rejected by the route. */
export const ALLOWED_PERIOD_DAYS = [7, 30, 90] as const;
export type PeriodDays = (typeof ALLOWED_PERIOD_DAYS)[number];
export const DEFAULT_PERIOD_DAYS: PeriodDays = 30;

/**
 * Statuses that represent real demand. `pending` is an unconfirmed intent and
 * `cancelled` is demand that evaporated — neither should steer ad budget.
 */
export const DEMAND_ORDER_STATUSES = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
] as const;

/** A product or category line rolled up for one district. */
export interface DemandItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface DistrictTargeting {
  district: string;
  districtId: number;
  orders: number;
  revenue: number;
  aov: number;
  uniqueCustomers: number;
  /** Share of the district's buyers who ordered at least twice in the period, 0–1. */
  repeatCustomerRate: number;
  /** `null` when the previous period had nothing to compare against. */
  growthOrdersPct: number | null;
  growthRevenuePct: number | null;
  /** Delivered ÷ settled (delivered + cancelled). `null` while nothing has settled. */
  deliverySuccessRate: number | null;
  /** 0–100, see `computeOpportunityScore`. */
  opportunityScore: number;
  confidence: ConfidenceLevel;
  cluster: ClusterKey;
  /** Share of total period revenue this district accounts for, 0–1. */
  revenueShare: number;
  topProducts: DemandItem[];
  topCategories: DemandItem[];
  previousOrders: number;
  previousRevenue: number;
}

/**
 * One district as the choropleth needs it. Deliberately thinner than
 * `DistrictTargeting`: the map is always drawn for the whole country, including
 * the districts a district filter excludes from every other panel.
 */
export interface DistrictHeatmapDatum {
  district: string;
  districtId: number;
  orders: number;
  revenue: number;
}

export interface ClusterPlaybook {
  cluster: ClusterKey;
  districts: string[];
  objective: CampaignObjective;
  /** Whole percentages across all four clusters, summing to exactly 100. */
  budgetShare: number;
  orders: number;
  revenue: number;
  uniqueCustomers: number;
  /** Categories to lead the creative with, ranked by revenue across the cluster. */
  messagingCategories: string[];
  messagingProducts: string[];
}

/** One current-vs-previous comparison, with the sample size that produced it. */
export interface TrendSignal {
  metric: 'orders' | 'revenue' | 'aov' | 'uniqueCustomers' | 'repeatRate';
  current: number;
  previous: number;
  changePct: number | null;
  confidence: ConfidenceLevel;
  sampleSize: number;
}

export interface TargetingTotals {
  orders: number;
  revenue: number;
  aov: number;
  uniqueCustomers: number;
  repeatCustomerRate: number;
  districts: number;
}

export interface TargetingResponse {
  period: {
    days: PeriodDays;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  totals: TargetingTotals;
  previousTotals: TargetingTotals;
  signals: TrendSignal[];
  districts: DistrictTargeting[];
  /**
   * Every district with orders in the period, ignoring the district filter, so
   * selecting one district narrows the tables without blanking the map.
   */
  mapDistricts: DistrictHeatmapDatum[];
  playbooks: ClusterPlaybook[];
  /** Highest `growthOrdersPct` among districts with at least medium confidence. */
  topGrowthDistrict: { district: string; growthOrdersPct: number | null } | null;
}

/* ── Confidence ──────────────────────────────────────────────────────── */

/**
 * Confidence is sample size, nothing else. A district with four orders can post
 * a +300% swing that means nothing, so the UI labels it rather than hiding it.
 */
export const CONFIDENCE_THRESHOLDS = { medium: 10, high: 30 } as const;

export function resolveConfidence(sampleSize: number): ConfidenceLevel {
  if (sampleSize >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (sampleSize >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/* ── Deltas ──────────────────────────────────────────────────────────── */

/** `null` rather than Infinity when there is no baseline — an honest "no comparison". */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return round(((current - previous) / previous) * 100, 1);
}

export function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/* ── Opportunity score ───────────────────────────────────────────────── */

/**
 * Weights of the opportunity score. They answer four questions a media buyer
 * actually asks, in the order they matter for a district-level budget split:
 *
 *   revenue (0.35) — where money already lands, the strongest prior for spend
 *   growth  (0.25) — whether the district is moving, not just large
 *   aov     (0.20) — how much a won conversion is worth there
 *   repeat  (0.20) — whether buyers come back, i.e. whether CAC is recoverable
 *
 * Revenue and AOV are min-max normalised against the best district in the same
 * period, so the score is a *ranking within this report*, never a cross-period
 * absolute. Change a weight and you change the ranking — deliberately visible.
 */
export const OPPORTUNITY_WEIGHTS = {
  revenue: 0.35,
  growth: 0.25,
  aov: 0.2,
  repeat: 0.2,
} as const;

/**
 * Map a growth percentage onto 0–1. -100% floors at 0, flat sits at 0.5 and
 * +100% or better tops out at 1, so one explosive district cannot dominate the
 * whole ranking. A district with no baseline but real orders is treated as
 * fully growing (1) — it is new demand, which is exactly what "test" is for.
 */
export function growthFactor(growthPct: number | null, orders: number): number {
  if (growthPct === null) return orders > 0 ? 1 : 0.5;
  return Math.min(1, Math.max(0, (growthPct + 100) / 200));
}

export function computeOpportunityScore(input: {
  revenue: number;
  maxRevenue: number;
  aov: number;
  maxAov: number;
  growthRevenuePct: number | null;
  orders: number;
  repeatCustomerRate: number;
}): number {
  const revenueFactor = safeDivide(input.revenue, input.maxRevenue);
  const aovFactor = safeDivide(input.aov, input.maxAov);
  const growth = growthFactor(input.growthRevenuePct, input.orders);
  const score =
    OPPORTUNITY_WEIGHTS.revenue * revenueFactor +
    OPPORTUNITY_WEIGHTS.growth * growth +
    OPPORTUNITY_WEIGHTS.aov * aovFactor +
    OPPORTUNITY_WEIGHTS.repeat * Math.min(1, Math.max(0, input.repeatCustomerRate));
  return round(score * 100, 1);
}

/* ── Clustering ──────────────────────────────────────────────────────── */

/** Order growth at or above this counts as "moving", below it as "flat". */
export const GROWTH_THRESHOLD_PCT = 5;

export const OBJECTIVE_BY_CLUSTER: Readonly<Record<ClusterKey, CampaignObjective>> = {
  scale: 'conversion',
  defend: 'retention',
  test: 'prospecting',
  watch: 'awareness',
};

/**
 * Four buckets, decided in priority order:
 *
 *   watch  — under `CONFIDENCE_THRESHOLDS.medium` orders. Too thin to act on;
 *            it is listed so it is not mistaken for zero, not so it is funded.
 *   scale  — scoring at or above the median *and* growing. Spend more here.
 *   defend — carrying at or above the median order volume while flat or
 *            shrinking. Revenue at risk; hold it with retention, not discovery.
 *   test   — everything else with enough data: real but unproven demand.
 */
export function assignCluster(input: {
  orders: number;
  opportunityScore: number;
  growthOrdersPct: number | null;
  medianScore: number;
  medianOrders: number;
}): ClusterKey {
  if (input.orders < CONFIDENCE_THRESHOLDS.medium) return 'watch';
  const growing =
    input.growthOrdersPct === null
      ? input.orders > 0
      : input.growthOrdersPct >= GROWTH_THRESHOLD_PCT;
  if (growing && input.opportunityScore >= input.medianScore) return 'scale';
  if (!growing && input.orders >= input.medianOrders) return 'defend';
  return 'test';
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/* ── Budget allocation ───────────────────────────────────────────────── */

/**
 * How much of the district opportunity in a cluster converts into budget.
 * `scale` gets its full weight; `defend` is a holding action so it is damped;
 * `test` buys information at a deliberately small slice; `watch` is a token
 * presence only, because the data underneath it is not yet trustworthy.
 */
export const CLUSTER_BUDGET_MULTIPLIER: Readonly<Record<ClusterKey, number>> = {
  scale: 1,
  defend: 0.8,
  test: 0.5,
  watch: 0.15,
};

/**
 * Split 100% across the clusters in proportion to
 * `Σ opportunityScore × multiplier`, then settle the rounding with the largest
 * remainder so the shares add to exactly 100 — a budget split that sums to 99
 * is a budget split a marketer cannot use.
 */
export function allocateBudgetShares(
  weights: Record<ClusterKey, number>,
): Record<ClusterKey, number> {
  const total = CLUSTER_KEYS.reduce((sum, key) => sum + Math.max(0, weights[key]), 0);
  const shares = {} as Record<ClusterKey, number>;
  if (total <= 0) {
    for (const key of CLUSTER_KEYS) shares[key] = 0;
    return shares;
  }

  const exact = CLUSTER_KEYS.map((key) => ({
    key,
    value: (Math.max(0, weights[key]) / total) * 100,
  }));
  let assigned = 0;
  for (const entry of exact) {
    shares[entry.key] = Math.floor(entry.value);
    assigned += shares[entry.key];
  }

  const byRemainder = [...exact].sort(
    (a, b) => b.value - Math.floor(b.value) - (a.value - Math.floor(a.value)),
  );
  for (let index = 0; assigned < 100; index += 1, assigned += 1) {
    shares[byRemainder[index % byRemainder.length].key] += 1;
  }
  return shares;
}
