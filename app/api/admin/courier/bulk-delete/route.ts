import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Manager access required' }, { status: 401 });
    }

    await connectDB();
    
    const { courierIds } = await request.json();
    
    if (!courierIds || !Array.isArray(courierIds) || courierIds.length === 0) {
      return NextResponse.json({ error: 'Courier IDs are required' }, { status: 400 });
    }

    // Get courier details before deletion for audit logging
    const couriersToDelete = await Courier.find({ _id: { $in: courierIds } }).lean();
    
    if (couriersToDelete.length === 0) {
      return NextResponse.json({ error: 'No couriers found with provided IDs' }, { status: 404 });
    }

    // Check if any couriers are in transit or delivered status
    const protectedCouriers = couriersToDelete.filter(courier => 
      ['in_transit', 'delivered'].includes(courier.status)
    );

    if (protectedCouriers.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete couriers that are in transit or delivered',
        protectedCouriers: protectedCouriers.map(c => ({ id: c._id, courierId: c.courierId, status: c.status }))
      }, { status: 400 });
    }

    // Delete the couriers
    const result = await Courier.deleteMany({ _id: { $in: courierIds } });

    // Log audit for each deleted courier
    const auditPromises = couriersToDelete.map(courier => 
      AuditLog.create({
        user: session.user.id,
        action: 'DELETE',
        resource: 'Courier',
        resourceId: (courier as any)._id.toString(),
        metadata: { 
          courierId: courier.courierId,
          orderId: courier.order,
          status: courier.status,
          bulkDelete: true,
          deletedCount: couriersToDelete.length
        }
      })
    );

    await Promise.all(auditPromises);

    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted ${result.deletedCount} courier(s)`,
      deletedCount: result.deletedCount,
      courierIds
    });
  } catch (error) {
    console.error('Bulk courier deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete couriers' }, { status: 500 });
  }
}
