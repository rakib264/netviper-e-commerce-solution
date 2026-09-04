import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
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
    const targetType = searchParams.get('targetType') || 'all';
    const search = searchParams.get('search') || '';

    let customers: any[] = [];

    // Base query for customers with phone numbers
    const baseQuery: any = { 
      role: 'customer', 
      isActive: true, 
      phone: { $exists: true, $ne: '' } 
    };

    // Add search filter
    if (search) {
      baseQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    switch (targetType) {
      case 'all':
        customers = await User.find(baseQuery)
          .select('_id firstName lastName phone email')
          .lean();
        break;

      case 'new':
        // Customers with 0-1 orders
        const newCustomerIds = await Order.aggregate([
          { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
          { $match: { orderCount: { $lte: 1 } } },
          { $project: { _id: '$_id' } }
        ]);
        
        const newIds = newCustomerIds.map(item => item._id);
        customers = await User.find({ 
          ...baseQuery,
          _id: { $in: newIds }
        }).select('_id firstName lastName phone email').lean();
        break;

      case 'repeated':
        // Customers with 2+ orders
        const repeatedCustomerIds = await Order.aggregate([
          { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
          { $match: { orderCount: { $gte: 2 } } },
          { $project: { _id: '$_id' } }
        ]);
        
        const repeatedIds = repeatedCustomerIds.map(item => item._id);
        customers = await User.find({ 
          ...baseQuery,
          _id: { $in: repeatedIds }
        }).select('_id firstName lastName phone email').lean();
        break;

      case 'best':
        // Top 20% customers by total spending
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const top20Percent = Math.ceil(totalCustomers * 0.2);
        
        const bestCustomerIds = await Order.aggregate([
          { $group: { _id: '$customer', totalSpent: { $sum: '$total' } } },
          { $sort: { totalSpent: -1 } },
          { $limit: top20Percent },
          { $project: { _id: '$_id' } }
        ]);
        
        const bestIds = bestCustomerIds.map(item => item._id);
        customers = await User.find({ 
          ...baseQuery,
          _id: { $in: bestIds }
        }).select('_id firstName lastName phone email').lean();
        break;

      default:
        return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    // Add order statistics for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({ customer: customer._id });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
        const lastOrder = orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return {
          ...customer,
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder?.createdAt
        };
      })
    );

    return NextResponse.json({
      customers: customersWithStats,
      count: customersWithStats.length
    });
  } catch (error) {
    console.error('Get messaging customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}