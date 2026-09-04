import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    
    // Get customer orders
    const orders = await Order.find({ customer: id });
    
    const stats = {
      orderCount: orders.length,
      lifetimeValue: orders.reduce((sum, order) => sum + order.total, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
      lastOrderDate: orders.length > 0 ? Math.max(...orders.map(order => new Date(order.createdAt).getTime())) : null,
      statusBreakdown: {
        pending: orders.filter(o => o.orderStatus === 'pending').length,
        confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
        processing: orders.filter(o => o.orderStatus === 'processing').length,
        shipped: orders.filter(o => o.orderStatus === 'shipped').length,
        delivered: orders.filter(o => o.orderStatus === 'delivered').length,
        cancelled: orders.filter(o => o.orderStatus === 'cancelled').length
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get customer stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer stats' }, { status: 500 });
  }
}
