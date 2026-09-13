import {
  districtSpellings,
  getDistrictId,
  normalizeDistrictName,
} from '@/lib/analytics/districts';
import {
  ALLOWED_PERIOD_DAYS,
  CLUSTER_KEYS,
  CLUSTER_BUDGET_MULTIPLIER,
  ClusterKey,
  ClusterPlaybook,
  DEFAULT_PERIOD_DAYS,
  DEMAND_ORDER_STATUSES,
  DemandItem,
  DistrictHeatmapDatum,
  DistrictTargeting,
  OBJECTIVE_BY_CLUSTER,
  PeriodDays,
  TargetingResponse,
  TargetingTotals,
  TrendSignal,
  allocateBudgetShares,
  assignCluster,
  computeOpportunityScore,
  median,
  percentChange,
  resolveConfidence,
  round,
} from '@/lib/analytics/targeting';
import { auth } from '@/lib/auth';
import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import Category from '@/lib/models/Category';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/** How many raw rows per district we pull before alias-merging down to the top 3. */
const DEMAND_ROWS_PER_DISTRICT = 10;
const TOP_DEMAND_ITEMS = 3;

/** The district an order belongs to: the map-picker value wins over the typed one. */
const DISTRICT_EXPR = {
  $ifNull: ['$shippingAddress.coordinates.district', '$shippingAddress.district'],
};

/**
 * Guests have no `customer` id, so repeat-purchase behaviour is keyed on the
 * phone number they checked out with. Falling back to the order id keeps a
 * phone-less guest as its own customer rather than merging every one of them.
 */
const CUSTOMER_EXPR = {
  $ifNull: ['$customer', { $ifNull: ['$shippingAddress.phone', '$_id'] }],
};

type PeriodTag = 'current' | 'previous';

interface DistrictBucket {
  orders: number;
  revenue: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  delivered: number;
  settled: number;
}

function emptyBucket(): DistrictBucket {
  return {
    orders: 0,
    revenue: 0,
    uniqueCustomers: 0,
    repeatCustomers: 0,
    delivered: 0,
    settled: 0,
  };
}

function addBucket(target: DistrictBucket, row: Partial<DistrictBucket>): void {
  target.orders += row.orders ?? 0;
  target.revenue += row.revenue ?? 0;
  target.uniqueCustomers += row.uniqueCustomers ?? 0;
  target.repeatCustomers += row.repeatCustomers ?? 0;
  target.delivered += row.delivered ?? 0;
  target.settled += row.settled ?? 0;
}

/** Fold alias rows onto one canonical name, then keep the strongest few. */
function mergeDemandItems(rows: { name: string; quantity: number; revenue: number }[]): DemandItem[] {
  const merged = new Map<string, DemandItem>();
  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;
    const existing = merged.get(name);
    if (existing) {
      existing.quantity += row.quantity;
      existing.revenue += row.revenue;
    } else {
      merged.set(name, { name, quantity: row.quantity, revenue: round(row.revenue) });
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name))
    .slice(0, TOP_DEMAND_ITEMS)
    .map((item) => ({ ...item, revenue: round(item.revenue) }));
}

function toTotals(bucket: DistrictBucket, districts: number): TargetingTotals {
  return {
    orders: bucket.orders,
    revenue: round(bucket.revenue),
    aov: bucket.orders > 0 ? round(bucket.revenue / bucket.orders) : 0,
    uniqueCustomers: bucket.uniqueCustomers,
    repeatCustomerRate:
      bucket.uniqueCustomers > 0
        ? round(bucket.repeatCustomers / bucket.uniqueCustomers, 4)
        : 0,
    districts,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const requestedDays = Number(searchParams.get('periodDays'));
    const periodDays: PeriodDays = (ALLOWED_PERIOD_DAYS as readonly number[]).includes(
      requestedDays,
    )
      ? (requestedDays as PeriodDays)
      : DEFAULT_PERIOD_DAYS;

    const districtFilter = normalizeDistrictName(searchParams.get('district'));

    const end = new Date();
    const start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // A district filter has to match every spelling that folds onto it, or the
    // orders stored under an alias silently vanish from the report.
    const districtMatch = districtFilter
      ? {
          $or: districtSpellings(districtFilter).flatMap((spelling) => {
            const exact = new RegExp(`^\\s*${spelling.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
            return [
              { 'shippingAddress.district': exact },
              { 'shippingAddress.coordinates.district': exact },
            ];
          }),
        }
      : null;

    const withDistrict = (base: Record<string, unknown>) =>
      districtMatch ? { $and: [base, districtMatch] } : base;

    const isDemand = { $in: ['$orderStatus', [...DEMAND_ORDER_STATUSES]] };

    /*
     * One pass over both periods. Grouping by customer first, then rolling that
     * up, is what makes `uniqueCustomers` and `repeatCustomerRate` correct: a
     * customer who bought three times is one customer, and the period totals
     * re-roll the same rows so a buyer active in two districts is still one.
     */
    const districtPipeline: PipelineStage[] = [
      {
        $match: withDistrict({
          createdAt: { $gte: previousStart, $lte: end },
          orderStatus: { $in: [...DEMAND_ORDER_STATUSES, 'cancelled'] },
        }),
      },
      {
        $group: {
          _id: {
            district: DISTRICT_EXPR,
            period: { $cond: [{ $gte: ['$createdAt', start] }, 'current', 'previous'] },
            customer: CUSTOMER_EXPR,
          },
          demandOrders: { $sum: { $cond: [isDemand, 1, 0] } },
          revenue: { $sum: { $cond: [isDemand, '$total', 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
          settled: {
            $sum: { $cond: [{ $in: ['$orderStatus', ['delivered', 'cancelled']] }, 1, 0] },
          },
        },
      },
      {
        $facet: {
          byDistrict: [
            {
              $group: {
                _id: { district: '$_id.district', period: '$_id.period' },
                orders: { $sum: '$demandOrders' },
                revenue: { $sum: '$revenue' },
                uniqueCustomers: { $sum: { $cond: [{ $gt: ['$demandOrders', 0] }, 1, 0] } },
                repeatCustomers: { $sum: { $cond: [{ $gte: ['$demandOrders', 2] }, 1, 0] } },
                delivered: { $sum: '$delivered' },
                settled: { $sum: '$settled' },
              },
            },
          ],
          byPeriod: [
            {
              $group: {
                _id: { period: '$_id.period', customer: '$_id.customer' },
                demandOrders: { $sum: '$demandOrders' },
                revenue: { $sum: '$revenue' },
              },
            },
            {
              $group: {
                _id: '$_id.period',
                orders: { $sum: '$demandOrders' },
                revenue: { $sum: '$revenue' },
                uniqueCustomers: { $sum: { $cond: [{ $gt: ['$demandOrders', 0] }, 1, 0] } },
                repeatCustomers: { $sum: { $cond: [{ $gte: ['$demandOrders', 2] }, 1, 0] } },
              },
            },
          ],
        },
      },
    ];

    /*
     * Geo-linked demand: what each district actually buys. Grouping by
     * (district, product) before the product lookup keeps the join on a small,
     * already-aggregated set instead of on every order line.
     */
    const demandPipeline: PipelineStage[] = [
      {
        $match: withDistrict({
          createdAt: { $gte: start, $lte: end },
          orderStatus: { $in: [...DEMAND_ORDER_STATUSES] },
        }),
      },
      { $addFields: { districtKey: DISTRICT_EXPR } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            district: '$districtKey',
            product: '$items.product',
            name: '$items.name',
          },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $addFields: { categoryId: { $arrayElemAt: ['$product.category', 0] } } },
      { $project: { product: 0 } },
      {
        $facet: {
          byProduct: [
            { $sort: { quantity: -1, revenue: -1, '_id.name': 1 } },
            {
              $group: {
                _id: '$_id.district',
                items: {
                  $push: { name: '$_id.name', quantity: '$quantity', revenue: '$revenue' },
                },
              },
            },
            { $project: { items: { $slice: ['$items', DEMAND_ROWS_PER_DISTRICT] } } },
          ],
          byCategory: [
            { $match: { categoryId: { $ne: null } } },
            {
              $group: {
                _id: { district: '$_id.district', category: '$categoryId' },
                quantity: { $sum: '$quantity' },
                revenue: { $sum: '$revenue' },
              },
            },
            { $sort: { quantity: -1, revenue: -1 } },
            {
              $group: {
                _id: '$_id.district',
                items: {
                  $push: {
                    categoryId: '$_id.category',
                    quantity: '$quantity',
                    revenue: '$revenue',
                  },
                },
              },
            },
            { $project: { items: { $slice: ['$items', DEMAND_ROWS_PER_DISTRICT] } } },
          ],
        },
      },
    ];

    /*
     * The map is drawn for the whole country whatever the district filter says,
     * so this roll-up deliberately does NOT go through `withDistrict`. Without
     * it, selecting one district would leave a single polygon on an otherwise
     * empty map — which reads as a broken map, not as a filter.
     */
    const mapPipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          orderStatus: { $in: [...DEMAND_ORDER_STATUSES] },
        },
      },
      {
        $group: {
          _id: DISTRICT_EXPR,
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ];

    const [districtResult, demandResult, mapResult] = await Promise.all([
      Order.aggregate(districtPipeline),
      Order.aggregate(demandPipeline),
      Order.aggregate(mapPipeline),
    ]);

    // Alias spellings are folded here too, so a district split across two
    // spellings lands on one polygon with the sum of both.
    const mapTotals = new Map<string, { orders: number; revenue: number }>();
    for (const row of mapResult as { _id: string | null; orders: number; revenue: number }[]) {
      const name = normalizeDistrictName(row._id);
      if (!name) continue;
      const entry = mapTotals.get(name) ?? { orders: 0, revenue: 0 };
      entry.orders += row.orders;
      entry.revenue += row.revenue ?? 0;
      mapTotals.set(name, entry);
    }

    const mapDistricts: DistrictHeatmapDatum[] = [...mapTotals.entries()]
      .map(([name, entry]) => ({
        district: name,
        districtId: getDistrictId(name),
        orders: entry.orders,
        revenue: round(entry.revenue),
      }))
      .sort((a, b) => b.orders - a.orders || a.district.localeCompare(b.district));

    const byDistrict = (districtResult[0]?.byDistrict ?? []) as {
      _id: { district: string | null; period: PeriodTag };
      orders: number;
      revenue: number;
      uniqueCustomers: number;
      repeatCustomers: number;
      delivered: number;
      settled: number;
    }[];
    const byPeriod = (districtResult[0]?.byPeriod ?? []) as {
      _id: PeriodTag;
      orders: number;
      revenue: number;
      uniqueCustomers: number;
      repeatCustomers: number;
    }[];

    /* ── Fold raw district spellings onto canonical names ──────────────── */

    const current = new Map<string, DistrictBucket>();
    const previous = new Map<string, DistrictBucket>();
    for (const row of byDistrict) {
      const district = normalizeDistrictName(row._id.district);
      if (!district) continue;
      const target = row._id.period === 'current' ? current : previous;
      if (!target.has(district)) target.set(district, emptyBucket());
      addBucket(target.get(district)!, row);
    }

    /* ── Geo-linked demand, same folding ───────────────────────────────── */

    const categoryRows = (demandResult[0]?.byCategory ?? []) as {
      _id: string | null;
      items: { categoryId: unknown; quantity: number; revenue: number }[];
    }[];
    const categoryIds = [
      ...new Set(
        categoryRows.flatMap((row) => row.items.map((item) => String(item.categoryId))),
      ),
    ];
    const categoryNames = new Map<string, string>();
    if (categoryIds.length > 0) {
      const categories = await Category.find({ _id: { $in: categoryIds } })
        .select('name')
        .lean();
      for (const category of categories) {
        categoryNames.set(String(category._id), category.name);
      }
    }

    const productsByDistrict = new Map<string, { name: string; quantity: number; revenue: number }[]>();
    for (const row of (demandResult[0]?.byProduct ?? []) as {
      _id: string | null;
      items: { name: string; quantity: number; revenue: number }[];
    }[]) {
      const district = normalizeDistrictName(row._id);
      if (!district) continue;
      productsByDistrict.set(district, [
        ...(productsByDistrict.get(district) ?? []),
        ...row.items,
      ]);
    }

    const categoriesByDistrict = new Map<string, { name: string; quantity: number; revenue: number }[]>();
    for (const row of categoryRows) {
      const district = normalizeDistrictName(row._id);
      if (!district) continue;
      const named = row.items
        .map((item) => ({
          name: categoryNames.get(String(item.categoryId)) ?? '',
          quantity: item.quantity,
          revenue: item.revenue,
        }))
        .filter((item) => item.name);
      categoriesByDistrict.set(district, [
        ...(categoriesByDistrict.get(district) ?? []),
        ...named,
      ]);
    }

    /* ── Per-district metrics ──────────────────────────────────────────── */

    const totalRevenue = [...current.values()].reduce((sum, b) => sum + b.revenue, 0);

    const base = [...current.entries()].map(([district, bucket]) => {
      const prior = previous.get(district) ?? emptyBucket();
      const aov = bucket.orders > 0 ? bucket.revenue / bucket.orders : 0;
      return {
        district,
        districtId: getDistrictId(district),
        orders: bucket.orders,
        revenue: bucket.revenue,
        aov,
        uniqueCustomers: bucket.uniqueCustomers,
        repeatCustomerRate:
          bucket.uniqueCustomers > 0 ? bucket.repeatCustomers / bucket.uniqueCustomers : 0,
        growthOrdersPct: percentChange(bucket.orders, prior.orders),
        growthRevenuePct: percentChange(bucket.revenue, prior.revenue),
        deliverySuccessRate: bucket.settled > 0 ? bucket.delivered / bucket.settled : null,
        revenueShare: totalRevenue > 0 ? bucket.revenue / totalRevenue : 0,
        previousOrders: prior.orders,
        previousRevenue: prior.revenue,
      };
    });

    const maxRevenue = Math.max(0, ...base.map((row) => row.revenue));
    const maxAov = Math.max(0, ...base.map((row) => row.aov));

    const scored = base.map((row) => ({
      ...row,
      opportunityScore: computeOpportunityScore({
        revenue: row.revenue,
        maxRevenue,
        aov: row.aov,
        maxAov,
        growthRevenuePct: row.growthRevenuePct,
        orders: row.orders,
        repeatCustomerRate: row.repeatCustomerRate,
      }),
    }));

    // Clustering compares each district against the middle of this report, so
    // the split adapts to the store's own scale instead of a fixed order count.
    const medianScore = median(scored.map((row) => row.opportunityScore));
    const medianOrders = median(scored.map((row) => row.orders));

    const districts: DistrictTargeting[] = scored
      .map((row) => ({
        district: row.district,
        districtId: row.districtId,
        orders: row.orders,
        revenue: round(row.revenue),
        aov: round(row.aov),
        uniqueCustomers: row.uniqueCustomers,
        repeatCustomerRate: round(row.repeatCustomerRate, 4),
        growthOrdersPct: row.growthOrdersPct,
        growthRevenuePct: row.growthRevenuePct,
        deliverySuccessRate:
          row.deliverySuccessRate === null ? null : round(row.deliverySuccessRate, 4),
        opportunityScore: row.opportunityScore,
        confidence: resolveConfidence(row.orders),
        cluster: assignCluster({
          orders: row.orders,
          opportunityScore: row.opportunityScore,
          growthOrdersPct: row.growthOrdersPct,
          medianScore,
          medianOrders,
        }),
        revenueShare: round(row.revenueShare, 4),
        topProducts: mergeDemandItems(productsByDistrict.get(row.district) ?? []),
        topCategories: mergeDemandItems(categoriesByDistrict.get(row.district) ?? []),
        previousOrders: row.previousOrders,
        previousRevenue: round(row.previousRevenue),
      }))
      .sort(
        (a, b) =>
          b.opportunityScore - a.opportunityScore ||
          b.orders - a.orders ||
          a.district.localeCompare(b.district),
      );

    /* ── Cluster playbooks ─────────────────────────────────────────────── */

    const clusterWeights = Object.fromEntries(
      CLUSTER_KEYS.map((key) => [key, 0]),
    ) as Record<ClusterKey, number>;
    for (const district of districts) {
      clusterWeights[district.cluster] +=
        district.opportunityScore * CLUSTER_BUDGET_MULTIPLIER[district.cluster];
    }
    const budgetShares = allocateBudgetShares(clusterWeights);

    const playbooks: ClusterPlaybook[] = CLUSTER_KEYS.map((cluster) => {
      const members = districts.filter((district) => district.cluster === cluster);
      const rank = (items: DemandItem[][]) => {
        const totals = new Map<string, number>();
        for (const list of items) {
          for (const item of list) {
            totals.set(item.name, (totals.get(item.name) ?? 0) + item.revenue);
          }
        }
        return [...totals.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, TOP_DEMAND_ITEMS)
          .map(([name]) => name);
      };

      return {
        cluster,
        districts: members.map((member) => member.district),
        objective: OBJECTIVE_BY_CLUSTER[cluster],
        budgetShare: members.length > 0 ? budgetShares[cluster] : 0,
        orders: members.reduce((sum, member) => sum + member.orders, 0),
        revenue: round(members.reduce((sum, member) => sum + member.revenue, 0)),
        uniqueCustomers: members.reduce((sum, member) => sum + member.uniqueCustomers, 0),
        messagingCategories: rank(members.map((member) => member.topCategories)),
        messagingProducts: rank(members.map((member) => member.topProducts)),
      };
    });

    /* ── Period totals and trend signals ───────────────────────────────── */

    const periodBucket = (tag: PeriodTag): DistrictBucket => {
      const row = byPeriod.find((entry) => entry._id === tag);
      const bucket = emptyBucket();
      if (row) addBucket(bucket, row);
      return bucket;
    };

    const totals = toTotals(periodBucket('current'), districts.length);
    const previousTotals = toTotals(periodBucket('previous'), previous.size);

    const signals: TrendSignal[] = (
      [
        ['orders', totals.orders, previousTotals.orders],
        ['revenue', totals.revenue, previousTotals.revenue],
        ['aov', totals.aov, previousTotals.aov],
        ['uniqueCustomers', totals.uniqueCustomers, previousTotals.uniqueCustomers],
        ['repeatRate', totals.repeatCustomerRate, previousTotals.repeatCustomerRate],
      ] as const
    ).map(([metric, currentValue, previousValue]) => ({
      metric,
      current: currentValue,
      previous: previousValue,
      changePct: percentChange(currentValue, previousValue),
      // Every signal is judged on the order count behind it, not on its own
      // magnitude — a 40% revenue jump off six orders is still a low-confidence
      // reading, and the badge says so.
      confidence: resolveConfidence(totals.orders),
      sampleSize: totals.orders,
    }));

    const growthCandidates = districts.filter(
      (district) => district.confidence !== 'low' && district.growthOrdersPct !== null,
    );
    const topGrowthDistrict =
      growthCandidates.length > 0
        ? growthCandidates.reduce((best, district) =>
            (district.growthOrdersPct ?? 0) > (best.growthOrdersPct ?? 0) ? district : best,
          )
        : null;

    const payload: TargetingResponse = {
      period: {
        days: periodDays,
        start: start.toISOString(),
        end: end.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: start.toISOString(),
      },
      totals,
      previousTotals,
      signals,
      districts,
      mapDistricts,
      playbooks,
      topGrowthDistrict: topGrowthDistrict
        ? {
            district: topGrowthDistrict.district,
            growthOrdersPct: topGrowthDistrict.growthOrdersPct,
          }
        : null,
    };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': PRIVATE_CACHE_HEADER },
    });
  } catch (error) {
    console.error('Customer trends targeting API error:', error);
    return NextResponse.json(
      { error: 'Failed to build targeting analytics' },
      { status: 500 },
    );
  }
}
