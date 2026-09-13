/**
 * Contract and pure maths for the `/admin` operations panels.
 *
 * Every figure here is derived from order, product and return documents that
 * already exist. Where a metric cannot be computed from stored data it is
 * reported as `null` and the UI says so, rather than being filled with a
 * plausible-looking number — an ops dashboard that quietly invents a delivery
 * time is worse than one that admits it has none.
 */

/* ── Shared ──────────────────────────────────────────────────────────── */

/** Statuses that represent an order the business is actually fulfilling. */
export const OPEN_ORDER_STATUSES = ['confirmed', 'processing', 'shipped'] as const;

/** An open order older than this is flagged as ageing. */
export const AGEING_ORDER_HOURS = 72;

/** Below this many days of cover a SKU is treated as at risk of stocking out. */
export const DAYS_OF_COVER_AT_RISK = 14;

export function ratePct(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/* ── Panels ──────────────────────────────────────────────────────────── */

export interface RevenueQuality {
  /** Merchandise value before discounts — the top of the revenue funnel. */
  grossMerchandiseValue: number;
  /** What actually settled: `total` on paid orders. */
  netPaidRevenue: number;
  discountTotal: number;
  shippingRevenue: number;
  /** Discounts as a share of GMV. */
  discountRatePct: number | null;
  /** Paid orders as a share of all orders placed. */
  paidOrderRatioPct: number | null;
  couponOrders: number;
  averageOrderValue: number;
  totalOrders: number;
}

export interface PaymentHealth {
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  /** Paid ÷ settled (paid + failed). Pending orders have not resolved yet. */
  successRatePct: number | null;
  refundRatePct: number | null;
  methods: Array<{
    method: string;
    orders: number;
    revenue: number;
    successRatePct: number | null;
  }>;
}

export interface FulfillmentSla {
  deliveredOrders: number;
  /** Hours from order placed to delivered, at hour granularity. */
  medianHoursToDeliver: number | null;
  p90HoursToDeliver: number | null;
  /** Delivered on or before `expectedDelivery`, where that was set. */
  onTimeRatePct: number | null;
  onTimeMeasured: number;
  openOrders: number;
  ageingOrders: number;
}

export interface ReturnsQuality {
  totalOrders: number;
  cancelledOrders: number;
  cancelRatePct: number | null;
  returnRequests: number;
  /** Requests ÷ delivered orders in the same window. */
  returnRatePct: number | null;
  topReasons: Array<{ reason: string; count: number }>;
}

export interface InventoryRiskItem {
  id: string;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  unitsSold: number;
  /** Stock ÷ daily sales rate. `null` when nothing sold in the window. */
  daysOfCover: number | null;
}

export interface InventoryRisk {
  trackedProducts: number;
  outOfStock: number;
  lowStock: number;
  atRisk: InventoryRiskItem[];
  byCategory: Array<{ category: string; atRisk: number }>;
}

export interface RetentionSnapshot {
  windowCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  /** Customers with two or more orders inside the window. */
  repeatCustomerRatePct: number | null;
  /** Share of window revenue from customers who had ordered before it. */
  returningRevenueSharePct: number | null;
  newRevenue: number;
  returningRevenue: number;
}

export interface DashboardOperations {
  revenueQuality: RevenueQuality;
  paymentHealth: PaymentHealth;
  fulfillment: FulfillmentSla;
  returns: ReturnsQuality;
  inventory: InventoryRisk;
  retention: RetentionSnapshot;
}

/* ── Percentiles from a histogram ────────────────────────────────────── */

/**
 * Percentile over an hour-bucketed histogram.
 *
 * Delivery durations are bucketed in the aggregation rather than pushed into
 * an array: a busy window would otherwise build one unbounded array per group
 * and risk the 16MB document limit. Hour granularity is far finer than any
 * delivery SLA needs.
 */
export function percentileFromHistogram(
  buckets: Array<{ hours: number; count: number }>,
  percentile: number,
): number | null {
  const sorted = [...buckets].sort((a, b) => a.hours - b.hours);
  const total = sorted.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return null;

  const target = total * percentile;
  let seen = 0;
  for (const bucket of sorted) {
    seen += bucket.count;
    if (seen >= target) return bucket.hours;
  }
  return sorted[sorted.length - 1].hours;
}

/** Stock ÷ daily sales rate over the window, rounded to one decimal. */
export function daysOfCover(
  quantity: number,
  unitsSold: number,
  windowDays: number,
): number | null {
  if (unitsSold <= 0 || windowDays <= 0) return null;
  const perDay = unitsSold / windowDays;
  if (perDay <= 0) return null;
  return Math.round((quantity / perDay) * 10) / 10;
}
