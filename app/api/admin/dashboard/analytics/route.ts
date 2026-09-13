import { auth } from '@/lib/auth';
import {
  AGEING_ORDER_HOURS,
  DAYS_OF_COVER_AT_RISK,
  OPEN_ORDER_STATUSES,
  daysOfCover,
  percentileFromHistogram,
  ratePct,
  type DashboardOperations,
  type InventoryRiskItem,
} from '@/lib/analytics/dashboard';
import { getDistrictId, normalizeDistrictName } from '@/lib/analytics/districts';
import {
  DEMAND_ORDER_STATUSES,
  percentChange,
  round,
  type DistrictHeatmapDatum,
} from '@/lib/analytics/targeting';
import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import Category from '@/lib/models/Category';
import Coupon from '@/lib/models/Coupon';
import Message from '@/lib/models/Message';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import { ReturnRequest } from '@/lib/models/ReturnRequest';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { Types, type PipelineStage } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const range = parseRange(params.get('range'));
    const customerType = params.get('customerType') || 'all';
    const categoryId = toObjectIdOrNull(params.get('category'));

    const { start, end, previousStart, customWindow } = resolveDateWindow(params, range);
    const cacheReader = unstable_cache(
      async () =>
        getDashboardAnalytics({
          start,
          end,
          previousStart,
          categoryId,
          customerType,
        }),
      /*
       * Cache key, and the reason presets are fast.
       *
       * A preset range keys on the range token alone. It must NOT key on the
       * resolved window: `start`/`end` are derived from `new Date()` on every
       * request, so a millisecond-precision key made each call unique and the
       * cache never once hit. A custom window still varies the key, but only
       * at day granularity — nobody picks a date range to the millisecond, and
       * keying on one would reintroduce the same miss.
       *
       * `v3` because the payload gained the operations panels; a stale `v2`
       * entry would deserialise without them.
       */
      [
        'admin-dashboard-analytics-v3',
        range,
        categoryId ? String(categoryId) : 'all',
        customerType,
        customWindow ? toDayKey(start) : 'rolling',
        customWindow ? toDayKey(end) : 'rolling',
      ],
      // Two minutes: long enough that flipping between range tabs and returning
      // to the page is served from cache, short enough that an admin watching
      // orders land is never looking at meaningfully stale numbers.
      { revalidate: 120 },
    );

    const analytics = await cacheReader();
    return NextResponse.json(analytics, {
      headers: { 'Cache-Control': PRIVATE_CACHE_HEADER },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    );
  }
}

type RangeKey = '7d' | '30d' | '90d' | '1y';

interface DateWindow {
  start: Date;
  end: Date;
  previousStart: Date;
  customWindow: boolean;
}

interface DashboardDistrictInsight extends DistrictHeatmapDatum {
  previousOrders: number;
  growthOrdersPct: number | null;
  share: number;
}

interface DashboardAnalyticsResult {
  statCards: {
    totalRevenue: number;
    deliveredRevenue: number;
    confirmedRevenue: number;
    totalOrders: number;
    activeCustomers: number;
    totalCustomers: number;
    totalProducts: number;
    totalCategories: number;
    totalCoupons: number;
    totalMessagesSent: number;
    conversionRate: number;
  };
  charts: {
    revenueOvertime: Array<{ month: string; revenue: number; orders: number }>;
    orderStatusDistribution: Array<{
      name: string;
      count: number;
      value: number;
      color: string;
    }>;
    customerGrowth: Array<{ month: string; customers: number }>;
    productSalesByCategory: Array<{ _id: string; sales: number; revenue: number }>;
  };
  widgets: {
    recentOrders: unknown[];
    recentCustomers: unknown[];
    lowStockProducts: unknown[];
    activeCoupons: unknown[];
    topSellingProducts: unknown[];
    highValueCustomers: unknown[];
  };
  geoInsights: {
    totals: {
      orders: number;
      revenue: number;
      districts: number;
    };
    mapDistricts: DistrictHeatmapDatum[];
    topDistricts: DashboardDistrictInsight[];
  };
  operations: DashboardOperations;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  processing: '#8B5CF6',
  shipped: '#06B6D4',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_DISTRICTS_LIMIT = 6;

function parseDateBound(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    parsed.setUTCHours(23, 59, 59, 999);
  }
  return parsed;
}

/** `YYYY-MM-DD` in UTC — the cache-key granularity for custom windows. */
function toDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseRange(value: string | null): RangeKey {
  if (value === '7d' || value === '30d' || value === '90d' || value === '1y') return value;
  return '30d';
}

function toObjectIdOrNull(value: string | null): Types.ObjectId | null {
  if (!value || !Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

function resolveDateWindow(searchParams: URLSearchParams, range: RangeKey): DateWindow {
  const from = parseDateBound(searchParams.get('dateFrom'));
  const to = parseDateBound(searchParams.get('dateTo'), true);
  const customWindow = Boolean(from || to);

  let end = to ?? new Date();
  let start = from ?? new Date(end.getTime() - RANGE_DAYS[range] * DAY_MS);
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }

  const spanMs = Math.max(DAY_MS, end.getTime() - start.getTime());
  const previousStart = new Date(start.getTime() - spanMs);

  return { start, end, previousStart, customWindow };
}

async function getDashboardAnalytics(input: {
  start: Date;
  end: Date;
  previousStart: Date;
  categoryId: Types.ObjectId | null;
  customerType: string;
}): Promise<DashboardAnalyticsResult> {
  await connectDB();

  const dateFilter = {
    createdAt: { $gte: input.start, $lte: input.end },
  };
  const windowDays = Math.max(
    1,
    (input.end.getTime() - input.start.getTime()) / DAY_MS,
  );

  /*
   * Three pipelines carry every order-derived number on this page, where there
   * used to be eight. `orderFacets` is one scan of the window at order level,
   * `itemFacets` one scan at line level (sharing a single product lookup that
   * the category and top-seller widgets each used to do for themselves), and
   * `retention` the only one that must look outside the window, because
   * "returning" is defined by whether a customer ordered before it.
   */
  const [
    orderFacets,
    itemFacets,
    retentionRow,
    inventoryFacets,
    returnsFacets,
    activeCustomers,
    totalCustomers,
    totalProducts,
    totalCategories,
    totalCoupons,
    totalMessagesSent,
    customerGrowth,
    recentOrders,
    recentCustomers,
    lowStockProducts,
    activeCoupons,
    geoInsights,
  ] = await Promise.all([
    getOrderWindowFacets(input.start, input.end),
    getItemWindowFacets(input.start, input.end, input.categoryId),
    getRetentionSnapshot(input.start, input.end),
    getInventoryFacets(),
    getReturnsFacets(input.start, input.end),
    getActiveCustomers(dateFilter),
    getTotalCustomers(dateFilter),
    getTotalProducts(input.categoryId),
    Category.countDocuments({ isActive: true }),
    Coupon.countDocuments({
      isActive: true,
      expiryDate: { $gte: new Date() },
    }),
    getTotalMessagesSent(dateFilter),
    getCustomerGrowth(input.start, input.end),
    getRecentOrders(dateFilter),
    getRecentCustomers(dateFilter, input.customerType),
    getLowStockProducts(),
    getActiveCoupons(),
    getDistrictDemandInsights(input.start, input.end, input.previousStart),
  ]);

  // Category and customer names are resolved once, for every panel that needs
  // them, instead of through a `$lookup` repeated on each aggregated row.
  const [categoryNames, highValueCustomers] = await Promise.all([
    resolveCategoryNames([
      ...itemFacets.categoryIds,
      ...inventoryFacets.categoryIds,
    ]),
    hydrateHighValueCustomers(orderFacets.highValueCustomers),
  ]);

  const totals = orderFacets.totals;
  const conversionRate =
    totalCustomers > 0 ? Number(((totals.totalOrders / totalCustomers) * 100).toFixed(2)) : 0;

  return {
    statCards: {
      totalRevenue: round(totals.totalRevenue),
      deliveredRevenue: round(totals.deliveredRevenue),
      confirmedRevenue: round(totals.confirmedRevenue),
      totalOrders: totals.totalOrders,
      activeCustomers,
      totalCustomers,
      totalProducts,
      totalCategories,
      totalCoupons,
      totalMessagesSent,
      conversionRate,
    },
    charts: {
      revenueOvertime: orderFacets.revenueOvertime,
      orderStatusDistribution: orderFacets.orderStatusDistribution,
      customerGrowth,
      productSalesByCategory: itemFacets.byCategory
        .map((row: { categoryId: string; sales: number; revenue: number }) => ({
          _id: categoryNames.get(row.categoryId) ?? row.categoryId,
          sales: row.sales,
          revenue: round(row.revenue),
        }))
        .sort(
          (a: { _id: string; revenue: number }, b: { _id: string; revenue: number }) =>
            b.revenue - a.revenue || a._id.localeCompare(b._id),
        )
        .slice(0, 10),
    },
    widgets: {
      recentOrders,
      recentCustomers,
      lowStockProducts,
      activeCoupons,
      topSellingProducts: itemFacets.topProducts,
      highValueCustomers,
    },
    geoInsights,
    operations: buildOperations({
      totals,
      paymentStatuses: orderFacets.paymentStatuses,
      paymentMethods: orderFacets.paymentMethods,
      deliveryBuckets: orderFacets.deliveryBuckets,
      onTime: orderFacets.onTime,
      retention: retentionRow,
      inventory: inventoryFacets,
      returns: returnsFacets,
      velocity: itemFacets.velocity,
      categoryNames,
      windowDays,
    }),
  };
}

/* ── Shared order-level pipeline ─────────────────────────────────────── */

interface OrderWindowTotals {
  totalOrders: number;
  totalRevenue: number;
  deliveredRevenue: number;
  confirmedRevenue: number;
  grossMerchandiseValue: number;
  discountTotal: number;
  shippingRevenue: number;
  paidOrders: number;
  couponOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  openOrders: number;
  ageingOrders: number;
}

const EMPTY_ORDER_TOTALS: OrderWindowTotals = {
  totalOrders: 0,
  totalRevenue: 0,
  deliveredRevenue: 0,
  confirmedRevenue: 0,
  grossMerchandiseValue: 0,
  discountTotal: 0,
  shippingRevenue: 0,
  paidOrders: 0,
  couponOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  openOrders: 0,
  ageingOrders: 0,
};

/**
 * Everything the dashboard needs from orders in the window, in one scan.
 *
 * Each branch of the `$facet` sees the same already-matched documents, so the
 * status split, the revenue series, payment health, delivery latency and the
 * spend leaderboard all cost one pass over the date range between them.
 */
async function getOrderWindowFacets(start: Date, end: Date) {
  const isPaid = { $eq: ['$paymentStatus', 'paid'] };
  const ageingCutoff = new Date(Date.now() - AGEING_ORDER_HOURS * 60 * 60 * 1000);
  const isOpen = { $in: ['$orderStatus', [...OPEN_ORDER_STATUSES]] };

  const [result] = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: { $cond: [isPaid, '$total', 0] } },
              deliveredRevenue: {
                $sum: {
                  $cond: [
                    { $and: [isPaid, { $eq: ['$orderStatus', 'delivered'] }] },
                    '$total',
                    0,
                  ],
                },
              },
              confirmedRevenue: {
                $sum: {
                  $cond: [
                    { $and: [isPaid, { $eq: ['$orderStatus', 'confirmed'] }] },
                    '$total',
                    0,
                  ],
                },
              },
              grossMerchandiseValue: { $sum: { $ifNull: ['$subtotal', 0] } },
              discountTotal: {
                $sum: {
                  $add: [
                    { $ifNull: ['$discountAmount', 0] },
                    { $ifNull: ['$dealDiscount', 0] },
                  ],
                },
              },
              shippingRevenue: { $sum: { $ifNull: ['$shippingCost', 0] } },
              paidOrders: { $sum: { $cond: [isPaid, 1, 0] } },
              couponOrders: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: [{ $ifNull: ['$couponCode', ''] }, ''] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              cancelledOrders: {
                $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] },
              },
              deliveredOrders: {
                $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] },
              },
              openOrders: { $sum: { $cond: [isOpen, 1, 0] } },
              ageingOrders: {
                $sum: {
                  $cond: [
                    { $and: [isOpen, { $lt: ['$createdAt', ageingCutoff] }] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        statuses: [
          { $group: { _id: '$orderStatus', count: { $sum: 1 }, value: { $sum: '$total' } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        paymentStatuses: [
          { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        paymentMethods: [
          {
            $group: {
              _id: '$paymentMethod',
              orders: { $sum: 1 },
              revenue: { $sum: { $cond: [isPaid, '$total', 0] } },
              paid: { $sum: { $cond: [isPaid, 1, 0] } },
              failed: {
                $sum: { $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0] },
              },
            },
          },
          { $sort: { orders: -1, _id: 1 } },
        ],
        revenueByMonth: [
          { $match: { paymentStatus: 'paid' } },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],
        deliveryBuckets: [
          { $match: { orderStatus: 'delivered', deliveredAt: { $ne: null } } },
          {
            $project: {
              hours: {
                $floor: {
                  $divide: [{ $subtract: ['$deliveredAt', '$createdAt'] }, 3600000],
                },
              },
            },
          },
          { $match: { hours: { $gte: 0 } } },
          { $group: { _id: '$hours', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        onTime: [
          {
            $match: {
              orderStatus: 'delivered',
              deliveredAt: { $ne: null },
              expectedDelivery: { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              measured: { $sum: 1 },
              onTime: {
                $sum: { $cond: [{ $lte: ['$deliveredAt', '$expectedDelivery'] }, 1, 0] },
              },
            },
          },
        ],
        highValueCustomers: [
          { $match: { paymentStatus: 'paid', customer: { $ne: null } } },
          {
            $group: {
              _id: '$customer',
              totalSpent: { $sum: '$total' },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { totalSpent: -1, _id: 1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  const totals: OrderWindowTotals = { ...EMPTY_ORDER_TOTALS, ...(result?.totals?.[0] ?? {}) };

  return {
    totals,
    orderStatusDistribution: (result?.statuses ?? []).map(
      (item: { _id: string; count: number; value: number }) => ({
        name: item._id,
        count: item.count,
        value: round(item.value ?? 0),
        color: STATUS_COLORS[item._id] || '#6B7280',
      }),
    ),
    paymentStatuses: (result?.paymentStatuses ?? []) as Array<{ _id: string; count: number }>,
    paymentMethods: (result?.paymentMethods ?? []) as Array<{
      _id: string;
      orders: number;
      revenue: number;
      paid: number;
      failed: number;
    }>,
    revenueOvertime: (result?.revenueByMonth ?? []).map(
      (item: { _id: { year: number; month: number }; revenue: number; orders: number }) => ({
        month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', {
          month: 'short',
        }),
        revenue: round(item.revenue ?? 0),
        orders: item.orders ?? 0,
      }),
    ),
    deliveryBuckets: (result?.deliveryBuckets ?? []).map(
      (row: { _id: number; count: number }) => ({ hours: row._id, count: row.count }),
    ),
    onTime: (result?.onTime?.[0] ?? { measured: 0, onTime: 0 }) as {
      measured: number;
      onTime: number;
    },
    highValueCustomers: (result?.highValueCustomers ?? []) as Array<{
      _id: Types.ObjectId;
      totalSpent: number;
      orderCount: number;
    }>,
  };
}

/* ── Shared line-item pipeline ───────────────────────────────────────── */

/**
 * Category mix, top sellers and sales velocity from one unwind and one product
 * lookup. Category names are resolved afterwards from their ids rather than
 * with a second `$lookup` per line.
 */
async function getItemWindowFacets(
  start: Date,
  end: Date,
  categoryId: Types.ObjectId | null,
) {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $in: ['delivered', 'shipped', 'processing'] },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    { $unwind: '$productInfo' },
    ...(categoryId ? [{ $match: { 'productInfo.category': categoryId } }] : []),
    {
      $addFields: {
        lineRevenue: { $multiply: ['$items.price', '$items.quantity'] },
      },
    },
    {
      $facet: {
        byCategory: [
          {
            $group: {
              _id: '$productInfo.category',
              sales: { $sum: '$items.quantity' },
              revenue: { $sum: '$lineRevenue' },
            },
          },
          { $sort: { revenue: -1, _id: 1 } },
          { $limit: 20 },
        ],
        topProducts: [
          {
            $group: {
              _id: '$items.product',
              name: { $first: '$productInfo.name' },
              image: { $first: '$productInfo.thumbnailImage' },
              totalSales: { $sum: '$items.quantity' },
              revenue: { $sum: '$lineRevenue' },
            },
          },
          { $sort: { totalSales: -1, revenue: -1, _id: 1 } },
          { $limit: 5 },
        ],
        velocity: [
          { $group: { _id: '$items.product', unitsSold: { $sum: '$items.quantity' } } },
        ],
      },
    },
  ];

  const [result] = await Order.aggregate(pipeline);

  const byCategory = (result?.byCategory ?? []).map(
    (row: { _id: Types.ObjectId | null; sales: number; revenue: number }) => ({
      categoryId: row._id ? String(row._id) : 'uncategorised',
      sales: row.sales ?? 0,
      revenue: row.revenue ?? 0,
    }),
  );

  const velocity = new Map<string, number>();
  for (const row of (result?.velocity ?? []) as Array<{
    _id: Types.ObjectId | null;
    unitsSold: number;
  }>) {
    if (row._id) velocity.set(String(row._id), row.unitsSold ?? 0);
  }

  return {
    byCategory,
    categoryIds: byCategory.map((row: { categoryId: string }) => row.categoryId),
    topProducts: (result?.topProducts ?? []).map(
      (row: {
        _id: Types.ObjectId;
        name: string;
        image?: string;
        totalSales: number;
        revenue: number;
      }) => ({
        _id: row._id,
        name: row.name,
        image: row.image,
        totalSales: row.totalSales ?? 0,
        revenue: round(row.revenue ?? 0),
      }),
    ),
    velocity,
  };
}

async function getTotalMessagesSent(dateFilter: { createdAt: { $gte: Date; $lte: Date } }) {
  const pipeline: PipelineStage[] = [
    { $match: dateFilter },
    { $group: { _id: null, total: { $sum: '$sentCount' } } },
  ];
  const result = await Message.aggregate(pipeline);
  return result[0]?.total || 0;
}

async function getActiveCustomers(dateFilter: { createdAt: { $gte: Date; $lte: Date } }) {
  return User.countDocuments({
    role: 'customer',
    createdAt: dateFilter.createdAt,
    lastLogin: { $gte: new Date(Date.now() - 30 * DAY_MS) },
  });
}

async function getTotalCustomers(dateFilter: { createdAt: { $gte: Date; $lte: Date } }) {
  return User.countDocuments({ role: 'customer', createdAt: dateFilter.createdAt });
}

async function getTotalProducts(categoryId: Types.ObjectId | null) {
  const filter: Record<string, unknown> = { isActive: true };
  if (categoryId) filter.category = categoryId;
  return Product.countDocuments(filter);
}

async function getCustomerGrowth(startDate: Date, endDate: Date) {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        role: 'customer',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        newCustomers: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ];

  const results = await User.aggregate(pipeline);

  return results.map((item: { _id: { year: number; month: number }; newCustomers: number }) => ({
    month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short' }),
    customers: item.newCustomers ?? 0,
  }));
}

async function getRecentOrders(dateFilter: { createdAt: { $gte: Date; $lte: Date } }) {
  return Order.find(dateFilter)
    .select('orderNumber customer total orderStatus createdAt')
    .populate('customer', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
}

async function getRecentCustomers(
  dateFilter: { createdAt: { $gte: Date; $lte: Date } },
  customerType?: string,
) {
  const matchFilter: Record<string, unknown> = { role: 'customer', createdAt: dateFilter.createdAt };

  if (customerType === 'new') {
    matchFilter.createdAt = { $gte: new Date(Date.now() - 7 * DAY_MS) };
  }

  if (customerType === 'returning') {
    const returningRows = await Order.aggregate([
      {
        $match: {
          customer: { $ne: null },
          createdAt: dateFilter.createdAt,
          orderStatus: { $in: [...DEMAND_ORDER_STATUSES] },
        },
      },
      { $group: { _id: '$customer', orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $sort: { orders: -1 } },
      { $limit: 100 },
    ]);

    const ids = returningRows.map((row: { _id: Types.ObjectId }) => row._id);
    if (ids.length === 0) return [];
    return User.find({ role: 'customer', _id: { $in: ids } })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
  }

  return User.find(matchFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .select('-password')
    .lean();
}

async function getLowStockProducts() {
  return Product.find({
    isActive: true,
    trackQuantity: true,
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
  })
    .select('name sku quantity lowStockThreshold')
    .sort({ quantity: 1 })
    .limit(5)
    .lean();
}

async function getActiveCoupons() {
  return Coupon.find({
    isActive: true,
    expiryDate: { $gte: new Date() },
    startDate: { $lte: new Date() },
  })
    .select('code type value currentUsage usageLimit expiryDate')
    .sort({ expiryDate: 1 })
    .limit(5)
    .lean();
}

async function getDistrictDemandInsights(start: Date, end: Date, previousStart: Date) {
  const districtExpr = {
    $ifNull: ['$shippingAddress.coordinates.district', '$shippingAddress.district'],
  };

  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: previousStart, $lte: end },
        orderStatus: { $in: [...DEMAND_ORDER_STATUSES] },
      },
    },
    {
      $group: {
        _id: {
          district: districtExpr,
          period: { $cond: [{ $gte: ['$createdAt', start] }, 'current', 'previous'] },
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
  ]);

  const byDistrict = new Map<
    string,
    { districtId: number; orders: number; revenue: number; previousOrders: number }
  >();
  for (const row of rows as {
    _id: { district: string | null; period: 'current' | 'previous' };
    orders: number;
    revenue: number;
  }[]) {
    const canonical = normalizeDistrictName(row._id?.district);
    if (!canonical) continue;
    const entry = byDistrict.get(canonical) ?? {
      districtId: getDistrictId(canonical),
      orders: 0,
      revenue: 0,
      previousOrders: 0,
    };

    if (row._id.period === 'current') {
      entry.orders += row.orders ?? 0;
      entry.revenue += row.revenue ?? 0;
    } else {
      entry.previousOrders += row.orders ?? 0;
    }
    byDistrict.set(canonical, entry);
  }

  const totalOrders = [...byDistrict.values()].reduce((sum, entry) => sum + entry.orders, 0);
  const totalRevenue = [...byDistrict.values()].reduce((sum, entry) => sum + entry.revenue, 0);

  const districts: DashboardDistrictInsight[] = [...byDistrict.entries()]
    .filter(([, entry]) => entry.orders > 0)
    .map(([district, entry]) => ({
      district,
      districtId: entry.districtId,
      orders: entry.orders,
      revenue: round(entry.revenue),
      previousOrders: entry.previousOrders,
      growthOrdersPct: percentChange(entry.orders, entry.previousOrders),
      share: totalOrders > 0 ? round(entry.orders / totalOrders, 4) : 0,
    }))
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue || a.district.localeCompare(b.district));

  const mapDistricts: DistrictHeatmapDatum[] = districts.map((district) => ({
    district: district.district,
    districtId: district.districtId,
    orders: district.orders,
    revenue: district.revenue,
  }));

  return {
    totals: {
      orders: totalOrders,
      revenue: round(totalRevenue),
      districts: districts.length,
    },
    mapDistricts,
    topDistricts: districts.slice(0, TOP_DISTRICTS_LIMIT),
  };
}

/* ── Retention ───────────────────────────────────────────────────────── */

/**
 * New vs returning, which is the one figure on this page that cannot be
 * answered from the window alone: a customer is "returning" because they
 * ordered *before* it. Grouping by customer with `$min: createdAt` gets the
 * first-ever order date in the same pass that sums their window activity.
 *
 * Guests have no account, so they are keyed on the phone they checked out
 * with, falling back to the order id — the same convention the targeting API
 * uses, so the two pages agree on what a customer is.
 */
async function getRetentionSnapshot(start: Date, end: Date) {
  const customerKey = {
    $ifNull: ['$customer', { $ifNull: ['$shippingAddress.phone', '$_id'] }],
  };
  const inWindow = { $gte: ['$createdAt', start] };

  const [row] = await Order.aggregate([
    {
      $match: {
        createdAt: { $lte: end },
        orderStatus: { $in: [...DEMAND_ORDER_STATUSES] },
      },
    },
    {
      $group: {
        _id: customerKey,
        firstOrderAt: { $min: '$createdAt' },
        windowOrders: { $sum: { $cond: [inWindow, 1, 0] } },
        windowRevenue: {
          $sum: {
            $cond: [
              { $and: [inWindow, { $eq: ['$paymentStatus', 'paid'] }] },
              '$total',
              0,
            ],
          },
        },
      },
    },
    { $match: { windowOrders: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        windowCustomers: { $sum: 1 },
        newCustomers: { $sum: { $cond: [{ $gte: ['$firstOrderAt', start] }, 1, 0] } },
        returningCustomers: { $sum: { $cond: [{ $lt: ['$firstOrderAt', start] }, 1, 0] } },
        repeatCustomers: { $sum: { $cond: [{ $gte: ['$windowOrders', 2] }, 1, 0] } },
        newRevenue: {
          $sum: { $cond: [{ $gte: ['$firstOrderAt', start] }, '$windowRevenue', 0] },
        },
        returningRevenue: {
          $sum: { $cond: [{ $lt: ['$firstOrderAt', start] }, '$windowRevenue', 0] },
        },
      },
    },
  ]);

  return {
    windowCustomers: row?.windowCustomers ?? 0,
    newCustomers: row?.newCustomers ?? 0,
    returningCustomers: row?.returningCustomers ?? 0,
    repeatCustomers: row?.repeatCustomers ?? 0,
    newRevenue: row?.newRevenue ?? 0,
    returningRevenue: row?.returningRevenue ?? 0,
  };
}

/* ── Inventory risk ──────────────────────────────────────────────────── */

/** Stock position for tracked, active products, plus the worst offenders. */
async function getInventoryFacets() {
  const [result] = await Product.aggregate([
    { $match: { isActive: true, trackQuantity: true } },
    {
      $addFields: {
        threshold: { $ifNull: ['$lowStockThreshold', 0] },
      },
    },
    {
      $facet: {
        counts: [
          {
            $group: {
              _id: null,
              trackedProducts: { $sum: 1 },
              outOfStock: { $sum: { $cond: [{ $lte: ['$quantity', 0] }, 1, 0] } },
              lowStock: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$quantity', 0] },
                        { $lte: ['$quantity', '$threshold'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        atRisk: [
          { $match: { $expr: { $lte: ['$quantity', '$threshold'] } } },
          { $sort: { quantity: 1, _id: 1 } },
          { $limit: 8 },
          { $project: { name: 1, quantity: 1, threshold: 1, category: 1 } },
        ],
        byCategory: [
          { $match: { $expr: { $lte: ['$quantity', '$threshold'] } } },
          { $group: { _id: '$category', atRisk: { $sum: 1 } } },
          { $sort: { atRisk: -1, _id: 1 } },
          { $limit: 6 },
        ],
      },
    },
  ]);

  const atRisk = (result?.atRisk ?? []) as Array<{
    _id: Types.ObjectId;
    name: string;
    quantity: number;
    threshold: number;
    category?: Types.ObjectId;
  }>;
  const byCategory = (result?.byCategory ?? []) as Array<{
    _id: Types.ObjectId | null;
    atRisk: number;
  }>;

  return {
    counts: (result?.counts?.[0] ?? {
      trackedProducts: 0,
      outOfStock: 0,
      lowStock: 0,
    }) as { trackedProducts: number; outOfStock: number; lowStock: number },
    atRisk,
    byCategory,
    categoryIds: [
      ...atRisk.map((row) => (row.category ? String(row.category) : 'uncategorised')),
      ...byCategory.map((row) => (row._id ? String(row._id) : 'uncategorised')),
    ],
  };
}

/* ── Returns ─────────────────────────────────────────────────────────── */

/** Return volume and the reasons customers actually gave, in one pass. */
async function getReturnsFacets(start: Date, end: Date) {
  const [result] = await ReturnRequest.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        reasons: [
          { $group: { _id: '$reason', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  return {
    total: (result?.total?.[0]?.count ?? 0) as number,
    reasons: ((result?.reasons ?? []) as Array<{ _id: string; count: number }>)
      .filter((row) => Boolean(row._id))
      .map((row) => ({ reason: row._id, count: row.count })),
  };
}

/* ── Name resolution ─────────────────────────────────────────────────── */

/** One `find` for every category id any panel referenced. */
async function resolveCategoryNames(ids: string[]): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return new Map();
  const categories = await Category.find({ _id: { $in: valid } })
    .select('name')
    .lean();
  return new Map(
    (categories as unknown as Array<{ _id: Types.ObjectId; name: string }>).map(
      (category) => [String(category._id), category.name],
    ),
  );
}

/** Attach customer documents to the top spenders found in the order facet. */
async function hydrateHighValueCustomers(
  rows: Array<{ _id: Types.ObjectId; totalSpent: number; orderCount: number }>,
) {
  if (rows.length === 0) return [];
  const users = await User.find({ _id: { $in: rows.map((row) => row._id) } })
    .select('firstName lastName email phone avatar')
    .lean();
  const byId = new Map(
    (users as unknown as Array<{ _id: Types.ObjectId }>).map((user) => [
      String(user._id),
      user,
    ]),
  );

  return rows
    .filter((row) => byId.has(String(row._id)))
    .map((row) => ({
      customer: byId.get(String(row._id)),
      totalSpent: round(row.totalSpent),
      orderCount: row.orderCount,
      averageOrderValue: row.orderCount > 0 ? round(row.totalSpent / row.orderCount) : 0,
    }));
}

/* ── Operations assembly ─────────────────────────────────────────────── */

function buildOperations(input: {
  totals: OrderWindowTotals;
  paymentStatuses: Array<{ _id: string; count: number }>;
  paymentMethods: Array<{
    _id: string;
    orders: number;
    revenue: number;
    paid: number;
    failed: number;
  }>;
  deliveryBuckets: Array<{ hours: number; count: number }>;
  onTime: { measured: number; onTime: number };
  retention: {
    windowCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    repeatCustomers: number;
    newRevenue: number;
    returningRevenue: number;
  };
  inventory: Awaited<ReturnType<typeof getInventoryFacets>>;
  returns: Awaited<ReturnType<typeof getReturnsFacets>>;
  velocity: Map<string, number>;
  categoryNames: Map<string, string>;
  windowDays: number;
}): DashboardOperations {
  const { totals } = input;

  const paymentCounts = new Map(input.paymentStatuses.map((row) => [row._id, row.count]));
  const paid = paymentCounts.get('paid') ?? 0;
  const failed = paymentCounts.get('failed') ?? 0;
  const refunded = paymentCounts.get('refunded') ?? 0;
  const pending = paymentCounts.get('pending') ?? 0;

  const atRisk: InventoryRiskItem[] = input.inventory.atRisk.map((row) => {
    const unitsSold = input.velocity.get(String(row._id)) ?? 0;
    return {
      id: String(row._id),
      name: row.name,
      quantity: row.quantity,
      lowStockThreshold: row.threshold,
      unitsSold,
      daysOfCover: daysOfCover(row.quantity, unitsSold, input.windowDays),
    };
  });

  const retentionRevenue = input.retention.newRevenue + input.retention.returningRevenue;

  return {
    revenueQuality: {
      grossMerchandiseValue: round(totals.grossMerchandiseValue),
      netPaidRevenue: round(totals.totalRevenue),
      discountTotal: round(totals.discountTotal),
      shippingRevenue: round(totals.shippingRevenue),
      discountRatePct: ratePct(totals.discountTotal, totals.grossMerchandiseValue),
      paidOrderRatioPct: ratePct(totals.paidOrders, totals.totalOrders),
      couponOrders: totals.couponOrders,
      averageOrderValue:
        totals.paidOrders > 0 ? round(totals.totalRevenue / totals.paidOrders) : 0,
      totalOrders: totals.totalOrders,
    },
    paymentHealth: {
      paid,
      pending,
      failed,
      refunded,
      // Pending orders have not resolved, so they are excluded from the
      // denominator rather than counted as failures.
      successRatePct: ratePct(paid, paid + failed),
      refundRatePct: ratePct(refunded, paid),
      methods: input.paymentMethods
        .filter((row) => Boolean(row._id))
        .map((row) => ({
          method: row._id,
          orders: row.orders,
          revenue: round(row.revenue),
          successRatePct: ratePct(row.paid, row.paid + row.failed),
        })),
    },
    fulfillment: {
      deliveredOrders: totals.deliveredOrders,
      medianHoursToDeliver: percentileFromHistogram(input.deliveryBuckets, 0.5),
      p90HoursToDeliver: percentileFromHistogram(input.deliveryBuckets, 0.9),
      onTimeRatePct: ratePct(input.onTime.onTime, input.onTime.measured),
      onTimeMeasured: input.onTime.measured,
      openOrders: totals.openOrders,
      ageingOrders: totals.ageingOrders,
    },
    returns: {
      totalOrders: totals.totalOrders,
      cancelledOrders: totals.cancelledOrders,
      cancelRatePct: ratePct(totals.cancelledOrders, totals.totalOrders),
      returnRequests: input.returns.total,
      returnRatePct: ratePct(input.returns.total, totals.deliveredOrders),
      topReasons: input.returns.reasons,
    },
    inventory: {
      trackedProducts: input.inventory.counts.trackedProducts,
      outOfStock: input.inventory.counts.outOfStock,
      lowStock: input.inventory.counts.lowStock,
      atRisk: atRisk
        .sort(
          (a, b) =>
            (a.daysOfCover ?? Number.POSITIVE_INFINITY) -
              (b.daysOfCover ?? Number.POSITIVE_INFINITY) ||
            a.quantity - b.quantity ||
            a.name.localeCompare(b.name),
        )
        .slice(0, 6),
      byCategory: input.inventory.byCategory.map((row) => {
        const key = row._id ? String(row._id) : 'uncategorised';
        return { category: input.categoryNames.get(key) ?? key, atRisk: row.atRisk };
      }),
    },
    retention: {
      windowCustomers: input.retention.windowCustomers,
      newCustomers: input.retention.newCustomers,
      returningCustomers: input.retention.returningCustomers,
      repeatCustomerRatePct: ratePct(
        input.retention.repeatCustomers,
        input.retention.windowCustomers,
      ),
      returningRevenueSharePct: ratePct(input.retention.returningRevenue, retentionRevenue),
      newRevenue: round(input.retention.newRevenue),
      returningRevenue: round(input.retention.returningRevenue),
    },
  };
}
