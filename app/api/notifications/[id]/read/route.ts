import { auth } from '@/lib/auth';
import InAppNotification from '@/lib/models/InAppNotification';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mark one notification read.
 *
 * Ownership is part of the update filter, not a separate check: `userId` sits in
 * the query, so a request for someone else's notification matches no document
 * and returns 404 without ever loading it. That also makes the "is it mine"
 * question and the write a single atomic operation.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await connectDB();

    const updated = await InAppNotification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { readAt: new Date() } },
      { new: true },
    )
      .select('_id readAt')
      .lean<{ _id: unknown } | null>();

    if (!updated) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const unreadCount = await InAppNotification.countDocuments({
      userId: session.user.id,
      readAt: null,
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Notification read error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 },
    );
  }
}
