import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    
    const courier = await Courier.findById(id)
      .populate('order', 'orderNumber total')
      .lean();

    if (!courier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 });
    }

    return NextResponse.json(courier);
  } catch (error) {
    console.error('Get courier error:', error);
    return NextResponse.json({ error: 'Failed to fetch courier' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    
    const data = await request.json();
    
    // Remove system generated fields that shouldn't be updated
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    
    // Structure the data properly for the courier model
    const updateData = {
      order: data.orderId,
      sender: {
        name: data.senderName,
        phone: data.senderPhone,
        address: data.senderAddress,
        division: data.senderDivision,
        district: data.senderDistrict,
      },
      receiver: {
        name: data.receiverName,
        phone: data.receiverPhone,
        address: data.receiverAddress,
        city: data.receiverDistrict, // Use district as city for consistency
        division: data.receiverDivision,
        district: data.receiverDistrict,
      },
      parcel: {
        type: data.parcelType,
        quantity: data.quantity,
        weight: data.weight,
        value: data.value,
        description: data.description,
      },
      isCOD: data.isCOD,
      codAmount: data.codAmount,
      isFragile: data.isFragile,
      charges: {
        deliveryCharge: data.deliveryCharge,
        codCharge: data.codCharge,
        totalCharge: data.deliveryCharge + data.codCharge
      },
      status: data.status,
      trackingNumber: data.trackingNumber,
      courierPartner: data.courierPartner,
      notes: data.notes,
    };

    const courier = await Courier.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('order', 'orderNumber total');

    if (!courier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 });
    }

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Courier',
      resourceId: courier._id.toString(),
      metadata: { 
        courierId: courier.courierId,
        orderId: data.orderId
      }
    });

    return NextResponse.json(courier);
  } catch (error) {
    console.error('Update courier error:', error);
    return NextResponse.json({ error: 'Failed to update courier' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    
    const courier = await Courier.findById(id);
    
    if (!courier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 });
    }

    // Check if courier can be deleted (not in transit or delivered)
    if (['in_transit', 'delivered'].includes(courier.status)) {
      return NextResponse.json({ 
        error: 'Cannot delete courier that is in transit or delivered' 
      }, { status: 400 });
    }

    await Courier.findByIdAndDelete(id);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'Courier',
      resourceId: id,
      metadata: { 
        courierId: courier.courierId,
        orderId: courier.order?.toString()
      }
    });

    return NextResponse.json({ message: 'Courier deleted successfully' });
  } catch (error) {
    console.error('Delete courier error:', error);
    return NextResponse.json({ error: 'Failed to delete courier' }, { status: 500 });
  }
}
