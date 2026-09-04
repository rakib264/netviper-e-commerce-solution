import {
  AD_TYPES,
  MAX_ADS_PER_TYPE,
  normalizeAdvertisementPayload,
  toAdvertisementDTO,
  type AdvertisementType,
} from '@/lib/advertisements/types';
import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Advertisement from '@/lib/models/Advertisement';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const query: Record<string, unknown> = {};
    if (type && AD_TYPES.includes(type as AdvertisementType)) {
      query.type = type;
    }

    const advertisements = await Advertisement.find(query)
      .sort({ type: 1, position: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      advertisements: advertisements.map((ad: any) => toAdvertisementDTO(ad)),
      limits: { maxPerType: MAX_ADS_PER_TYPE },
    });
  } catch (error) {
    console.error('Get advertisements error:', error);
    return NextResponse.json({ error: 'Failed to fetch advertisements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { value, errors } = normalizeAdvertisementPayload(await request.json());

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const familyCount = await Advertisement.countDocuments({ type: value.type });
    if (familyCount >= MAX_ADS_PER_TYPE) {
      return NextResponse.json({
        error: 'Limit reached',
        details: [`A maximum of ${MAX_ADS_PER_TYPE} ${value.type} advertisements is supported`],
      }, { status: 400 });
    }

    // Positions are a display order, not a unique slot — take the next free one
    // rather than rejecting a collision the admin cannot see.
    const taken = new Set(
      (await Advertisement.find({ type: value.type }).select('position').lean()).map(
        (ad: any) => ad.position,
      ),
    );
    if (taken.has(value.position)) {
      const free = Array.from({ length: MAX_ADS_PER_TYPE }, (_, i) => i + 1).find(
        (position) => !taken.has(position),
      );
      value.position = free ?? value.position;
    }

    const { cta, ...rest } = value;
    const advertisement = await Advertisement.create({
      ...rest,
      ...(cta ? { cta } : {}),
      isActive: value.isActive !== undefined ? value.isActive : true,
    });

    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Advertisement',
      resourceId: advertisement._id.toString(),
      metadata: {
        type: advertisement.type,
        position: advertisement.position,
        title: advertisement.title,
        mediaType: advertisement.mediaType,
      }
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: 'Advertisement created successfully',
      advertisement: toAdvertisementDTO(advertisement.toObject()),
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create advertisement error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create advertisement',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Advertisement ID is required' }, { status: 400 });
    }

    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
    }

    await Advertisement.findByIdAndDelete(id);

    // Close the gap so the remaining cards keep a contiguous 1..n order.
    const remaining = await Advertisement.find({ type: advertisement.type })
      .sort({ position: 1 })
      .select('_id')
      .lean();
    if (remaining.length > 0) {
      await Advertisement.bulkWrite(
        remaining.map((ad: any, index: number) => ({
          updateOne: { filter: { _id: ad._id }, update: { $set: { position: index + 1 } } },
        })),
        { ordered: false },
      );
    }

    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'Advertisement',
      resourceId: id,
      metadata: {
        type: advertisement.type,
        position: advertisement.position,
        title: advertisement.title
      }
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    console.error('Delete advertisement error:', error);
    return NextResponse.json({ error: 'Failed to delete advertisement' }, { status: 500 });
  }
}
