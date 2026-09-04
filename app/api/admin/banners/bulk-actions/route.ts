import { auth } from '@/lib/auth';
import Banner from '@/lib/models/Banner';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateBanners } from '@/lib/cache/revalidate';

// POST - Bulk actions for banners
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, bannerIds } = body;

    // Validation
    if (!action || !Array.isArray(bannerIds) || bannerIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Validate all banner IDs
    const validIds = bannerIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== bannerIds.length) {
      return NextResponse.json({ error: 'Invalid banner IDs provided' }, { status: 400 });
    }

    let affectedCount = 0;
    let message = '';

    switch (action) {
      case 'activate':
        const activateResult = await Banner.updateMany(
          { _id: { $in: validIds } },
          { $set: { isActive: true } }
        );
        affectedCount = activateResult.modifiedCount;
        message = `${affectedCount} banner(s) activated successfully`;
        break;

      case 'deactivate':
        const deactivateResult = await Banner.updateMany(
          { _id: { $in: validIds } },
          { $set: { isActive: false } }
        );
        affectedCount = deactivateResult.modifiedCount;
        message = `${affectedCount} banner(s) deactivated successfully`;
        break;

      case 'delete':
        const deleteResult = await Banner.deleteMany({ _id: { $in: validIds } });
        affectedCount = deleteResult.deletedCount;
        message = `${affectedCount} banner(s) deleted successfully`;
        break;

      case 'reorder':
        // For reordering, expect bannerIds to be in the desired order
        const bulkOps = validIds.map((id, index) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { order: index + 1 } }
          }
        }));
        
        const reorderResult = await Banner.bulkWrite(bulkOps);

        // `bulkWrite` bypasses Mongoose middleware, so the schema-level
        // invalidation never fires for a reorder — it is done by hand here.
        revalidateBanners();
        affectedCount = reorderResult.modifiedCount || 0;
        message = `${affectedCount} banner(s) reordered successfully`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message,
      affected: affectedCount
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 });
  }
}
