import {
  AD_TYPES,
  MAX_ADS_PER_TYPE,
  type AdvertisementType,
} from '@/lib/advertisements/types';
import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Advertisement from '@/lib/models/Advertisement';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateAdvertisements } from '@/lib/cache/revalidate';

interface ReorderItem {
  _id: string;
  position: number;
}

const ALLOWED_ROLES = ['admin', 'manager'];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { type, items }: { type: AdvertisementType; items: ReorderItem[] } =
      await request.json();

    if (!type || !AD_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Valid type is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    const positions = items.map(item => item.position);
    if (positions.length !== new Set(positions).size) {
      return NextResponse.json({ error: 'Duplicate positions detected' }, { status: 400 });
    }

    for (const item of items) {
      if (item.position < 1 || item.position > MAX_ADS_PER_TYPE) {
        return NextResponse.json({
          error: `Invalid position ${item.position} for ${type} advertisement`
        }, { status: 400 });
      }
    }

    await Advertisement.bulkWrite(
      items.map(item => ({
        updateOne: {
          filter: { _id: item._id, type },
          update: { $set: { position: item.position } },
        },
      })),
      { ordered: false },
    );

    // `bulkWrite` bypasses Mongoose middleware, so the schema-level
    // invalidation never fires for a reorder — it is done by hand here.
    revalidateAdvertisements();

    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Advertisement',
      resourceId: 'bulk',
      metadata: {
        type,
        action: 'reorder',
        itemsCount: items.length
      }
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: 'Advertisements reordered successfully'
    });

  } catch (error: any) {
    console.error('Reorder advertisements error:', error);
    return NextResponse.json({
      error: 'Failed to reorder advertisements',
      details: error.message
    }, { status: 500 });
  }
}
