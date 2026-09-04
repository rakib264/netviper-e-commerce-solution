import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import ComboBundle from '@/lib/models/ComboBundle';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateComboBundles } from '@/lib/cache/revalidate';

const ALLOWED_ROLES = ['admin', 'manager'];

/**
 * Order the offers within the combos manager, which is also the order the
 * storefront rail and listing use. Their position *on the homepage* stays with
 * Home Sections — this is the order inside the section.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const orderedIds: string[] = Array.isArray(body?.orderedIds)
      ? body.orderedIds
          .map(String)
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (!orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds required' }, { status: 400 });
    }

    await connectDB();
    await ComboBundle.bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      })),
    );

    // `bulkWrite` bypasses Mongoose middleware, so the schema-level
    // invalidation never fires for a reorder — it is done by hand here.
    revalidateComboBundles();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'reorder',
      resource: 'combo-bundle',
      metadata: { count: orderedIds.length },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('combo-bundles reorder', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
