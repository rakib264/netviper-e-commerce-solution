import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Coupon from '@/lib/models/Coupon';
import connectDB from '@/lib/mongodb';
 
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const active = searchParams.get('active');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    if (type) {
      query.type = type;
    }

    if (active !== null && active !== undefined) {
      query.isActive = active === 'true';
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let coupons;
    try {
      coupons = await Coupon.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (populateError) {
      // If populate fails, try without populate for existing documents
      console.warn('Populate failed, fetching without populate:', populateError);
      coupons = await Coupon.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const total = await Coupon.countDocuments(query);

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Coupons API error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const data = await request.json();
    data.createdBy = session.user.id;
    
    const coupon = await Coupon.create(data);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Coupon',
      resourceId: coupon._id.toString(),
      metadata: { 
        couponCode: coupon.code, 
        type: coupon.type,
        value: coupon.value
      }
    });
    
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Create coupon error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids, isActive } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No coupon ids provided' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const result = await Coupon.updateMany({ _id: { $in: ids } }, { $set: { isActive } });

    // Audit logs (best-effort)
    try {
      await AuditLog.insertMany(
        ids.map((id: string) => ({
          user: session.user.id,
          action: 'UPDATE',
          resource: 'Coupon',
          resourceId: id,
          changes: [{ field: 'isActive', oldValue: undefined, newValue: isActive }],
          metadata: { bulk: true },
        }))
      );
    } catch (_) {}

    return NextResponse.json({ updated: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Bulk update coupons error:', error);
    return NextResponse.json({ error: 'Failed to update coupons' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No coupon ids provided' }, { status: 400 });
    }

    const results: Array<{ id: string; status: 'deleted' | 'skipped'; reason?: string }> = [];

    for (const id of ids) {
      try {
        const doc = await Coupon.findById(id);
        if (!doc) {
          results.push({ id, status: 'skipped', reason: 'Coupon not found' });
          continue;
        }
        await Coupon.findByIdAndDelete(id);
        await AuditLog.create({
          user: session.user.id,
          action: 'DELETE',
          resource: 'Coupon',
          resourceId: id,
          metadata: { couponCode: doc.code, bulk: true },
        });
        results.push({ id, status: 'deleted' });
      } catch (_e) {
        results.push({ id, status: 'skipped', reason: 'Unexpected error' });
      }
    }

    const deleted = results.filter((r) => r.status === 'deleted').length;
    const skipped = results.length - deleted;
    return NextResponse.json({ deleted, skipped, results });
  } catch (error) {
    console.error('Bulk delete coupons error:', error);
    return NextResponse.json({ error: 'Failed to bulk delete coupons' }, { status: 500 });
  }
}