import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await context.params;
    
    // Validate if the ID is a valid MongoDB ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    let order: any = await Order.findById(id)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name thumbnailImage')
      .lean();
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle guest orders (where customer is null)
    if (!order.customer) {
      order.customer = {
        _id: null,
        firstName: order.shippingAddress.name?.split(' ')[0] || 'Guest',
        lastName: order.shippingAddress.name?.split(' ').slice(1).join(' ') || 'User',
        email: order.shippingAddress.email || 'No email provided',
        phone: order.shippingAddress.phone || 'No phone provided'
      };
    }
    
    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;
    
    // Validate if the ID is a valid MongoDB ObjectId
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const { status } = await request.json();
    const order = await Order.findById(id);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user owns this order or is admin
    if (order.customer && order.customer.toString() !== session.user.id && 
        !['admin', 'manager', 'staff'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For guest orders (no customer), only admins can modify
    if (!order.customer && !['admin', 'manager', 'staff'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow cancelling if pending/confirmed
    if (status === 'cancelled' && ['pending','confirmed'].includes(order.orderStatus)) {
      order.orderStatus = 'cancelled';
      await order.save();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid status change' }, { status: 400 });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}