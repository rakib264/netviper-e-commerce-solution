import { ReturnRequest } from '@/lib/models/ReturnRequest';
import connectDB from '@/lib/mongodb';
import { requireReturnsAdmin } from '@/lib/returns/admin-guard';
import { isReturnStatus } from '@/lib/returns/policy';
import { serializeReturnRequest } from '@/lib/returns/service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The admin returns list.
 *
 * Read-only. The `PUT` and `DELETE` handlers that used to live here were a
 * second, divergent copy of the update logic in `[id]/route.ts` — same job,
 * different request shape, no transition validation, and its own status-history
 * write. Both now live on `[id]`, so there is one write path to reason about.
 */

const MAX_LIMIT = 100;

/** User input reaches `$regex`, so metacharacters must be neutralised. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10),
    );
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = (searchParams.get('search') || '').trim();

    const query: Record<string, unknown> = {};
    // Validated against the policy's status list, so an unknown value returns
    // an empty page rather than being silently ignored.
    if (status && status !== 'all') {
      if (!isReturnStatus(status)) {
        return NextResponse.json({ error: 'Unknown return status' }, { status: 400 });
      }
      query.status = status;
    }
    if (type === 'return' || type === 'exchange') query.type = type;

    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { requestId: { $regex: safe, $options: 'i' } },
        { orderId: { $regex: safe, $options: 'i' } },
        { customerName: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const [rows, total, statusCounts] = await Promise.all([
      ReturnRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReturnRequest.countDocuments(query),
      // Powers the filter chips without a request per status.
      ReturnRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return NextResponse.json({
      success: true,
      returnRequests: rows.map(serializeReturnRequest),
      counts: Object.fromEntries(
        (statusCounts as Array<{ _id: string; count: number }>).map((entry) => [
          entry._id,
          entry.count,
        ]),
      ),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching return requests:', error);
    return NextResponse.json({ error: 'Failed to load return requests' }, { status: 500 });
  }
}
