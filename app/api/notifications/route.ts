import { auth } from '@/lib/auth';
import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import InAppNotification from '@/lib/models/InAppNotification';
import connectDB from '@/lib/mongodb';
import { toNotificationDTO } from '@/lib/notifications/serialize';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * The signed-in user's notification inbox.
 *
 * Scoped to `session.user.id` in the query itself rather than filtered after
 * the fact, so there is no shape of request that can read another user's
 * inbox. Both bells — customer and admin — read this endpoint; the rows an
 * account receives are decided when they are written, by the event's audience,
 * so no `audience` parameter is accepted or needed.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, requestedLimit))
      : DEFAULT_LIMIT;
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

    const scope = { userId: session.user.id };

    const [rows, unreadCount, total] = await Promise.all([
      InAppNotification.find(scope)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        // One past the page, so `hasMore` needs no second count.
        .limit(limit + 1)
        .lean(),
      // Answered from the partial index on unread rows alone.
      InAppNotification.countDocuments({ ...scope, readAt: null }),
      InAppNotification.countDocuments(scope),
    ]);

    const hasMore = rows.length > limit;
    const notifications = (hasMore ? rows.slice(0, limit) : rows).map((row) =>
      toNotificationDTO(row as Record<string, any>),
    );

    return NextResponse.json(
      {
        success: true,
        notifications,
        unreadCount,
        pagination: { page, limit, total, hasMore },
      },
      // Per-account content: never shared, and the badge has to be current.
      { headers: { 'Cache-Control': PRIVATE_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Notifications list error:', error);
    return NextResponse.json(
      { error: 'Failed to load notifications' },
      { status: 500 },
    );
  }
}
