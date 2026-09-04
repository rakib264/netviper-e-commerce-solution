import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ProductShowcaseSection from '@/lib/models/ProductShowcaseSection';
import { HOMEPAGE_SECTIONS_CACHE_TAG } from '@/lib/landing/homepage-sections-server';
import mongoose from 'mongoose';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateProductShowcase } from '@/lib/cache/revalidate';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !['admin', 'manager', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const orderedIds: string[] = Array.isArray(body.orderedIds)
      ? body.orderedIds.map(String)
      : [];

    if (!orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds required' }, { status: 400 });
    }

    await connectDB();
    const ops = orderedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index } },
        },
      }));

    if (ops.length) {
      await ProductShowcaseSection.bulkWrite(ops);

      // `bulkWrite` bypasses Mongoose middleware, so the schema-level
      // invalidation never fires for a reorder — it is done by hand here.
      revalidateProductShowcase();
    }

    // This orders sections *within* the showcase screen. Their position on the
    // homepage is owned by Home Sections, so only the caches are dropped here.
    revalidateTag(HOMEPAGE_SECTIONS_CACHE_TAG);
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('product-showcase reorder', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
