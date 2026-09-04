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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const active = searchParams.get('active');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Enhanced filtering
    const district = searchParams.get('district');
    const division = searchParams.get('division');
    const minSpent = searchParams.get('minSpent');
    const maxSpent = searchParams.get('maxSpent');
    const minOrders = searchParams.get('minOrders');
    const maxOrders = searchParams.get('maxOrders');
    const joinedAfter = searchParams.get('joinedAfter');
    const joinedBefore = searchParams.get('joinedBefore');

    const skip = (page - 1) * limit;

    // Build query for customers only
    const query: any = { role: 'customer' };

    // Enhanced search across multiple fields
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.division': { $regex: search, $options: 'i' } },
        { 'address.district': { $regex: search, $options: 'i' } },
        { 'address.postCode': { $regex: search, $options: 'i' } }
      ];
    }

    if (active !== null && active !== undefined && active !== '' && active !== 'all') {
      query.isActive = active === 'true';
    }

    // Location filters
    if (district && district !== 'all') query['address.district'] = { $regex: district, $options: 'i' };
    if (division && division !== 'all') query['address.division'] = { $regex: division, $options: 'i' };

    // Date range filters
    if (joinedAfter || joinedBefore) {
      query.createdAt = {};
      if (joinedAfter) query.createdAt.$gte = new Date(joinedAfter);
      if (joinedBefore) query.createdAt.$lte = new Date(joinedBefore);
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const customers = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Add order statistics for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({ customer: customer._id });
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        return {
          ...customer,
          totalOrders,
          totalSpent,
          averageOrderValue
        };
      })
    );

    // Apply post-processing filters based on calculated stats
    let filteredCustomers = customersWithStats;
    
    if (minSpent || maxSpent) {
      filteredCustomers = filteredCustomers.filter(customer => {
        if (minSpent && customer.totalSpent < parseFloat(minSpent)) return false;
        if (maxSpent && customer.totalSpent > parseFloat(maxSpent)) return false;
        return true;
      });
    }

    if (minOrders || maxOrders) {
      filteredCustomers = filteredCustomers.filter(customer => {
        if (minOrders && customer.totalOrders < parseInt(minOrders)) return false;
        if (maxOrders && customer.totalOrders > parseInt(maxOrders)) return false;
        return true;
      });
    }

    const total = await User.countDocuments(query);

    return NextResponse.json({
      customers: filteredCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}