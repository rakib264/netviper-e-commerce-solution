import { auth } from '@/lib/auth';
import { syncCourierStatuses } from '@/lib/courier/dispatch';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Refreshes consignment statuses from the providers.
 *
 * With no `courierIds`, it sweeps every dispatched consignment that has not
 * reached a terminal state — the shape a cron job wants.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json().catch(() => ({}));

    let courierIds: string[] = Array.isArray(body.courierIds)
      ? body.courierIds.map(String)
      : [];

    if (!courierIds.length) {
      const limit = Math.min(Number(body.limit) || 50, 200);
      const pending = await Courier.find({
        consignmentId: { $exists: true, $ne: null },
        courierPartner: { $in: ['pathao', 'steadfast'] },
        status: { $nin: ['delivered', 'returned', 'cancelled'] },
      })
        .select('_id')
        .sort({ lastSyncedAt: 1 })
        .limit(limit)
        .lean();
      courierIds = pending.map((courier: any) => courier._id.toString());
    }

    if (!courierIds.length) {
      return NextResponse.json({ results: [], summary: { checked: 0, updated: 0, failed: 0 } });
    }

    const results = await syncCourierStatuses(courierIds);

    return NextResponse.json({
      results,
      summary: {
        checked: results.length,
        updated: results.filter((result) => result.ok).length,
        failed: results.filter((result) => !result.ok).length,
      },
    });
  } catch (error) {
    console.error('Courier status sync error:', error);
    return NextResponse.json({ error: 'Failed to sync courier statuses' }, { status: 500 });
  }
}
