import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
 
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { status, trackingNumber, notes } = await request.json();
    const { id } = await context.params;
    const oldCourier = await Courier.findById(id);
    
    if (!oldCourier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 });
    }

    const updateData: any = { status };
    
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    
    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'picked') {
      updateData.pickupDate = new Date();
    }
    
    if (status === 'delivered') {
      updateData.deliveryDate = new Date();
    }

    const updatedCourier = await Courier.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Courier',
      resourceId: id,
      changes: [
        {
          field: 'status',
          oldValue: oldCourier.status,
          newValue: status
        }
      ],
      metadata: { 
        courierId: updatedCourier.courierId,
        trackingNumber: trackingNumber || ''
      }
    });

    return NextResponse.json(updatedCourier);
  } catch (error) {
    console.error('Update courier status error:', error);
    return NextResponse.json({ error: 'Failed to update courier status' }, { status: 500 });
  }
}