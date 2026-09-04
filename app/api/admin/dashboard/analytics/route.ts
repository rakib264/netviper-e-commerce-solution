import { auth } from '@/lib/auth';
import Category from '@/lib/models/Category';
import Coupon from '@/lib/models/Coupon';
import Message from '@/lib/models/Message';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const category = searchParams.get('category');
    const customerType = searchParams.get('customerType');

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    // Build category filter for products/orders
    const categoryFilter: any = {};
    if (category) {
      categoryFilter.category = category;
    }

    // Parallel execution for better performance
    const [
      // Stat Cards Data
      totalRevenue,
      deliveredRevenue,
      confirmedRevenue,
      totalOrders,
      activeCustomers,
      totalCustomers,
      totalProducts,
      totalCategories,
      totalCoupons,
      totalMessagesSent,
      
      // Chart Data
      revenueOvertime,
      orderStatusDistribution,
      customerGrowth,
      productSalesByCategory,
      
      // Widget Data
      recentOrders,
      recentCustomers,
      lowStockProducts,
      activeCoupons,
      topSellingProducts,
      highValueCustomers
    ] = await Promise.all([
      // Stat Cards
      getRevenueStats(dateFilter),
      getDeliveredRevenue(dateFilter),
      getConfirmedRevenue(dateFilter),
      getTotalOrders(dateFilter),
      getActiveCustomers(dateFilter),
      getTotalCustomers(dateFilter),
      getTotalProducts(categoryFilter),
      getTotalCategories(),
      getTotalCoupons(),
      getTotalMessagesSent(dateFilter),
      
      // Charts
      getRevenueOvertime(dateFilter),
      getOrderStatusDistribution(dateFilter),
      getCustomerGrowth(dateFilter),
      getProductSalesByCategory(dateFilter, category || undefined),
      
      // Widgets
      getRecentOrders(dateFilter),
      getRecentCustomers(dateFilter, customerType || undefined),
      getLowStockProducts(),
      getActiveCoupons(),
      getTopSellingProducts(dateFilter, category || undefined),
      getHighValueCustomers(dateFilter)
    ]);

    // Calculate conversion rate
    const conversionRate = totalCustomers > 0 ? ((totalOrders / totalCustomers) * 100) : 0;

    const analytics = {
      statCards: {
        totalRevenue,
        deliveredRevenue,
        confirmedRevenue,
        totalOrders,
        activeCustomers,
        totalCustomers,
        totalProducts,
        totalCategories,
        totalCoupons,
        totalMessagesSent,
        conversionRate: Number(conversionRate.toFixed(2))
      },
      charts: {
        revenueOvertime,
        orderStatusDistribution,
        customerGrowth,
        productSalesByCategory
      },
      widgets: {
        recentOrders,
        recentCustomers,
        lowStockProducts,
        activeCoupons,
        topSellingProducts,
        highValueCustomers
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    );
  }
}

// Stat Cards Functions
async function getRevenueStats(dateFilter: any) {
  const pipeline: any[] = [
    { $match: { ...dateFilter, paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ];
  const result = await Order.aggregate(pipeline);
  return result[0]?.total || 0;
}

async function getDeliveredRevenue(dateFilter: any) {
  const pipeline: any[] = [
    { $match: { ...dateFilter, orderStatus: 'delivered', paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ];
  const result = await Order.aggregate(pipeline);
  return result[0]?.total || 0;
}

async function getConfirmedRevenue(dateFilter: any) {
  const pipeline: any[] = [
    { $match: { ...dateFilter, orderStatus: 'confirmed', paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ];
  const result = await Order.aggregate(pipeline);
  return result[0]?.total || 0;
}

async function getTotalOrders(dateFilter: any) {
  return await Order.countDocuments(dateFilter);
}

async function getActiveCustomers(dateFilter: any) {
  const activeFilter = {
    ...dateFilter,
    lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  };
  return await User.countDocuments({ role: 'customer', ...activeFilter });
}

async function getTotalCustomers(dateFilter: any) {
  return await User.countDocuments({ role: 'customer', ...dateFilter });
}

async function getTotalProducts(categoryFilter: any) {
  return await Product.countDocuments({ isActive: true, ...categoryFilter });
}

async function getTotalCategories() {
  return await Category.countDocuments({ isActive: true });
}

async function getTotalCoupons() {
  return await Coupon.countDocuments({ 
    isActive: true,
    expiryDate: { $gte: new Date() }
  });
}

async function getTotalMessagesSent(dateFilter: any) {
  const pipeline: any[] = [
    { $match: dateFilter },
    { $group: { _id: null, total: { $sum: '$sentCount' } } }
  ];
  const result = await Message.aggregate(pipeline);
  return result[0]?.total || 0;
}

// Chart Data Functions
async function getRevenueOvertime(dateFilter: any) {
  const startDate = dateFilter.createdAt?.$gte || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  const endDate = dateFilter.createdAt?.$lte || new Date();
  
  const pipeline: any[] = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1 as 1, '_id.month': 1 as 1 } }
  ];

  const results = await Order.aggregate(pipeline);
  
  return results.map(item => ({
    month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short' }),
    revenue: item.revenue,
    orders: item.orders
  }));
}

async function getOrderStatusDistribution(dateFilter: any) {
  const pipeline: any[] = [
    { $match: dateFilter },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        value: { $sum: '$total' }
      }
    }
  ];

  const results = await Order.aggregate(pipeline);
  
  const statusColors = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    processing: '#8B5CF6',
    shipped: '#06B6D4',
    delivered: '#10B981',
    cancelled: '#EF4444'
  };

  return results.map(item => ({
    name: item._id,
    count: item.count,
    value: item.value,
    color: statusColors[item._id as keyof typeof statusColors] || '#6B7280'
  }));
}

async function getCustomerGrowth(dateFilter: any) {
  const startDate = dateFilter.createdAt?.$gte || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  const endDate = dateFilter.createdAt?.$lte || new Date();

  const pipeline: any[] = [
    {
      $match: {
        role: 'customer',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        newCustomers: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1 as 1, '_id.month': 1 as 1 } }
  ];

  const results = await User.aggregate(pipeline);
  
  return results.map(item => ({
    month: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'short' }),
    customers: item.newCustomers
  }));
}

async function getProductSalesByCategory(dateFilter: any, categoryFilter?: string) {
  const matchStage: any = {
    ...dateFilter,
    orderStatus: { $in: ['delivered', 'shipped', 'processing'] }
  };

  const pipeline: any[] = [
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $lookup: {
        from: 'categories',
        localField: 'productInfo.category',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    { $unwind: '$categoryInfo' },
    {
      $group: {
        _id: '$categoryInfo.name',
        sales: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { revenue: -1 as -1 } },
    { $limit: 10 }
  ];

  if (categoryFilter) {
    pipeline.splice(6, 0, { $match: { 'categoryInfo._id': categoryFilter } });
  }

  return await Order.aggregate(pipeline);
}

// Widget Data Functions
async function getRecentOrders(dateFilter: any) {
  return await Order.find(dateFilter)
    .populate('customer', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
}

async function getRecentCustomers(dateFilter: any, customerType?: string) {
  const matchFilter: any = { role: 'customer', ...dateFilter };
  
  if (customerType === 'new') {
    matchFilter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  }

  return await User.find(matchFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .select('-password')
    .lean();
}

async function getLowStockProducts() {
  return await Product.find({
    isActive: true,
    trackQuantity: true,
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
  })
    .sort({ quantity: 1 })
    .limit(5)
    .lean();
}

async function getActiveCoupons() {
  return await Coupon.find({
    isActive: true,
    expiryDate: { $gte: new Date() },
    startDate: { $lte: new Date() }
  })
    .sort({ expiryDate: 1 })
    .limit(5)
    .lean();
}

async function getTopSellingProducts(dateFilter: any, categoryFilter?: string) {
  const matchStage: any = {
    ...dateFilter,
    orderStatus: { $in: ['delivered', 'shipped', 'processing'] }
  };

  const pipeline: any[] = [
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    ...(categoryFilter ? [
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      { $match: { 'categoryInfo._id': categoryFilter } }
    ] : []),
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$productInfo.name' },
        image: { $first: '$productInfo.thumbnailImage' },
        totalSales: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { totalSales: -1 as -1 } },
    { $limit: 5 }
  ];

  return await Order.aggregate(pipeline);
}

async function getHighValueCustomers(dateFilter: any) {
  const pipeline: any[] = [
    { $match: { ...dateFilter, paymentStatus: 'paid' } },
    {
      $group: {
        _id: '$customer',
        totalSpent: { $sum: '$total' },
        orderCount: { $sum: 1 }
      }
    },
    { $match: { _id: { $ne: null } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    { $unwind: '$customerInfo' },
    {
      $project: {
        customer: '$customerInfo',
        totalSpent: 1,
        orderCount: 1,
        averageOrderValue: { $divide: ['$totalSpent', '$orderCount'] }
      }
    },
    { $sort: { totalSpent: -1 as -1 } },
    { $limit: 5 }
  ];

  return await Order.aggregate(pipeline);
}
