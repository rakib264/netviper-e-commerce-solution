import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const customer = searchParams.get('customer') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.orderStatus = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (customer) {
      query.customer = customer;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name thumbnailImage')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Process orders to handle guest orders (where customer is null)
    const processedOrders = orders.map(order => {
      if (!order.customer) {
        // For guest orders, create customer data from shipping address
        order.customer = {
          _id: null,
          firstName: order.shippingAddress.name?.split(' ')[0] || 'Guest',
          lastName: order.shippingAddress.name?.split(' ').slice(1).join(' ') || 'User',
          email: order.shippingAddress.email || 'No email provided',
          phone: order.shippingAddress.phone || 'No phone provided'
        };
      }
      return order;
    });

    const total = await Order.countDocuments(query);

    // Log VIEW action
    await createAuditLog({
      userId: session.user.id,
      action: 'VIEW',
      resource: 'Order',
      resourceId: 'list',
      metadata: {
        filters: { search, status, paymentStatus, dateFrom, dateTo, sortBy, sortOrder },
        resultCount: processedOrders.length,
        totalCount: total
      },
      ipAddress: getClientIP(request)
    });

    return NextResponse.json({
      orders: processedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}