import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { courierIds, status } = await request.json();
    
    if (!courierIds || !Array.isArray(courierIds) || courierIds.length === 0) {
      return NextResponse.json({ error: 'Courier IDs are required' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['pending', 'picked', 'in_transit', 'delivered', 'returned', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get current couriers to track changes
    const currentCouriers = await Courier.find({ _id: { $in: courierIds } });
    
    // Update all courier statuses
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };

    // Add specific date fields based on status
    if (status === 'picked') {
      updateData.pickupDate = new Date();
    } else if (status === 'delivered') {
      updateData.deliveryDate = new Date();
    }

    const result = await Courier.updateMany(
      { _id: { $in: courierIds } },
      updateData
    );

    // Log audit for each courier
    const auditPromises = currentCouriers.map(courier => 
      AuditLog.create({
        user: session.user.id,
        action: 'UPDATE',
        resource: 'Courier',
        resourceId: courier._id.toString(),
        changes: [
          {
            field: 'status',
            oldValue: courier.status,
            newValue: status
          }
        ],
        metadata: { 
          courierId: courier.courierId,
          bulkUpdate: true,
          affectedCount: courierIds.length
        }
      })
    );

    await Promise.all(auditPromises);

    return NextResponse.json({ 
      success: true,
      message: `Successfully updated ${result.modifiedCount} courier(s) to ${status}`,
      courierIds,
      status,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk courier status update error:', error);
    return NextResponse.json({ error: 'Failed to update courier statuses' }, { status: 500 });
  }
}
