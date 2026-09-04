import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import CuratedSection from '@/lib/models/CuratedSection';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateCuratedSections } from '@/lib/cache/revalidate';

const ALLOWED_ROLES = ['admin', 'manager'];

/**
 * Order the sections *within* the curated manager. Their position on the
 * homepage is owned by Home Sections; this is the list order and the tie-break
 * for newly created slots.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const orderedIds: string[] = Array.isArray(body?.orderedIds)
      ? body.orderedIds.map(String).filter((id: string) =>
          mongoose.Types.ObjectId.isValid(id),
        )
      : [];

    if (!orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds required' }, { status: 400 });
    }

    await connectDB();
    await CuratedSection.bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
      })),
    );

    // `bulkWrite` bypasses Mongoose middleware, so the schema-level
    // invalidation never fires for a reorder — it is done by hand here.
    revalidateCuratedSections();

    await revalidateDynamicSlots();

    await createAuditLog({
      userId: session.user.id as string,
      action: 'reorder',
      resource: 'curated-section',
      metadata: { order: orderedIds },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('curated-sections reorder', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
