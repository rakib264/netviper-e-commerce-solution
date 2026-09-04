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
    const orderNumber = searchParams.get('orderNumber');
    
    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    const order = await Order.findOne({ orderNumber })
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name thumbnailImage')
      .lean();
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle guest orders (where customer is null)
    if (!(order as any).customer) {
      (order as any).customer = {
        _id: null,
        firstName: (order as any).shippingAddress.name?.split(' ')[0] || 'Guest',
        lastName: (order as any).shippingAddress.name?.split(' ').slice(1).join(' ') || 'User',
        email: (order as any).shippingAddress.email || 'No email provided',
        phone: (order as any).shippingAddress.phone || 'No phone provided'
      };
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order by number error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
