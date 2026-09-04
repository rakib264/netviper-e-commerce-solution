import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { cleanupCouriersForOrders } from '@/lib/utils/courierCleanup';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { orderIds } = await request.json();
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Invalid order IDs' }, { status: 400 });
    }

    // Get orders before deletion for audit log
    const orders = await Order.find({ _id: { $in: orderIds } });
    const orderNumbers = orders.map(order => order.orderNumber);

    // Cleanup all associated courier records using utility function
    const courierCleanup = await cleanupCouriersForOrders(orderIds);

    // Delete orders
    const result = await Order.deleteMany({ _id: { $in: orderIds } });

    // Log audit with courier cleanup information
    await AuditLog.create({
      user: session.user.id,
      action: 'BULK_DELETE',
      resource: 'Order',
      resourceId: null,
      changes: [],
      metadata: { 
        deletedCount: result.deletedCount,
        orderNumbers: orderNumbers,
        reason: 'Bulk deletion via admin panel',
        cascadeDeleted: {
          couriers: {
            count: courierCleanup.deletedCount,
            courierIds: courierCleanup.deletedCourierIds
          }
        }
      }
    });

    const message = courierCleanup.deletedCount > 0 
      ? `${result.deletedCount} orders and ${courierCleanup.deletedCount} associated courier records deleted successfully`
      : `${result.deletedCount} orders deleted successfully`;

    return NextResponse.json({ 
      message,
      deletedCount: result.deletedCount,
      deletedCouriers: courierCleanup.deletedCount,
      orderNumbers
    });
  } catch (error) {
    console.error('Bulk delete orders error:', error);
    return NextResponse.json({ error: 'Failed to delete orders' }, { status: 500 });
  }
}
