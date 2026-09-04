import { auth } from '@/lib/auth';
import InAppNotification from '@/lib/models/InAppNotification';
import connectDB from '@/lib/mongodb';
import { NextResponse } from 'next/server';

/** Mark every unread notification in the caller's own inbox read. */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const result = await InAppNotification.updateMany(
      { userId: session.user.id, readAt: null },
      { $set: { readAt: new Date() } },
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount || 0,
      unreadCount: 0,
    });
  } catch (error) {
    console.error('Notification read-all error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 },
    );
  }
}
