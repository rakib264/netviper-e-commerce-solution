import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { orderIds, status } = await request.json();
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Invalid order IDs' }, { status: 400 });
    }

    if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get orders before update for audit log
    const orders = await Order.find({ _id: { $in: orderIds } });
    const orderNumbers = orders.map(order => order.orderNumber);

    // Update orders
    const updateData: any = { orderStatus: status };
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      updateData
    );

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'BULK_UPDATE',
      resource: 'Order',
      resourceId: null,
      changes: [{
        field: 'orderStatus',
        oldValue: 'various',
        newValue: status
      }],
      metadata: { 
        updatedCount: result.modifiedCount,
        orderNumbers: orderNumbers,
        newStatus: status
      }
    });

    return NextResponse.json({ 
      message: `${result.modifiedCount} orders updated successfully`,
      updatedCount: result.modifiedCount,
      orderNumbers,
      newStatus: status
    });
  } catch (error) {
    console.error('Bulk update orders error:', error);
    return NextResponse.json({ error: 'Failed to update orders' }, { status: 500 });
  }
}
