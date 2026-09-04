import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Category from '@/lib/models/Category';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateCategories } from '@/lib/cache/revalidate';

/**
 * Reorder categories within a sibling group.
 * Body: { parentId: string | null, orderedIds: string[] }
 * - parentId null  → reorder root categories
 * - parentId set   → reorder children of that parent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const parentId: string | null =
      body.parentId === undefined || body.parentId === '' || body.parentId === null
        ? null
        : String(body.parentId);
    const orderedIds: string[] = Array.isArray(body.orderedIds) ? body.orderedIds : [];

    if (orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'An ordered array of category IDs is required' },
        { status: 400 }
      );
    }

    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return NextResponse.json({ error: 'Invalid parent ID' }, { status: 400 });
    }

    const validIds = orderedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Invalid category IDs provided' }, { status: 400 });
    }

    const siblingQuery = parentId
      ? { parent: parentId }
      : { $or: [{ parent: null }, { parent: { $exists: false } }] };

    const siblings = await Category.find(siblingQuery).select('_id').lean();
    const siblingIdSet = new Set(siblings.map((s) => String(s._id)));

    if (validIds.length !== siblingIdSet.size || validIds.some((id) => !siblingIdSet.has(id))) {
      return NextResponse.json(
        {
          error:
            'Ordered IDs must include every sibling in this group and no others. Refresh and try again.',
        },
        { status: 400 }
      );
    }

    await Category.bulkWrite(
      validIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: index } },
        },
      }))
    );

    // `bulkWrite` bypasses Mongoose middleware, so the schema-level
    // invalidation never fires for a reorder — it is done by hand here.
    revalidateCategories();

    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Category',
      resourceId: parentId || 'roots',
      metadata: {
        reorder: true,
        parentId,
        orderedIds: validIds,
      },
    });

    return NextResponse.json({ success: true, message: 'Category order updated' });
  } catch (error) {
    console.error('Reorder categories error:', error);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}
