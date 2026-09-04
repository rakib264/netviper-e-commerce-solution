import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Coupon from '@/lib/models/Coupon';
import connectDB from '@/lib/mongodb';
 
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    let coupon;
    try {
      coupon = await Coupon.findById(id)
        .populate('createdBy', 'firstName lastName')
        .populate('applicableCategories', 'name slug')
        .populate('applicableProducts', 'name slug');
    } catch (populateError) {
      // If populate fails, try without populate for existing documents
      console.warn('Populate failed, fetching without populate:', populateError);
      coupon = await Coupon.findById(id);
    }
    
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Get coupon error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const data = await request.json();
    const { id } = await context.params;
    const oldCoupon = await Coupon.findById(id);
    
    if (!oldCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    // Log audit with changes
    const changes = [];
    for (const key in data) {
      if (oldCoupon[key] !== data[key]) {
        changes.push({
          field: key,
          oldValue: oldCoupon[key],
          newValue: data[key]
        });
      }
    }

    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Coupon',
      resourceId: id,
      changes,
      metadata: { couponCode: updatedCoupon.code }
    });

    return NextResponse.json(updatedCoupon);
  } catch (error) {
    console.error('Update coupon error:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    const coupon = await Coupon.findById(id);
    
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await Coupon.findByIdAndDelete(id);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'Coupon',
      resourceId: id,
      metadata: { couponCode: coupon.code }
    });

    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}