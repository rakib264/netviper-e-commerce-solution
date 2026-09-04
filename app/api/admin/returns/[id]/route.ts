import { ReturnRequest } from '@/lib/models/ReturnRequest';
import connectDB from '@/lib/mongodb';
import { requireReturnsAdmin } from '@/lib/returns/admin-guard';
import {
  deleteReturnRequests,
  serializeReturnRequest,
  updateReturnRequest,
} from '@/lib/returns/service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * One return request: read it, decide on it, delete it.
 *
 * The single admin write path. `PUT /api/admin/returns` and
 * `PUT /api/returns` both used to update a return with their own slightly
 * different bodies, their own status-history handling and no transition
 * validation between them; everything now funnels through
 * `lib/returns/service`, which owns the transition map, the history entry, the
 * audit log and the customer notification.
 *
 * `id` accepts either the Mongo `_id` or the human `requestId`, because the
 * admin list holds one and support deep-links carry the other.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const { id } = await context.params;
    await connectDB();

    const found = await ReturnRequest.findOne({
      $or: [
        ...(/^[0-9a-fA-F]{24}$/.test(id) ? [{ _id: id }] : []),
        { requestId: id },
      ],
    }).lean();

    if (!found) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      returnRequest: serializeReturnRequest(found),
    });
  } catch (error) {
    console.error('Error fetching return request:', error);
    return NextResponse.json({ error: 'Failed to load return request' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const result = await updateReturnRequest({
      identifier: id,
      status: body.status,
      message: body.message,
      adminNotes: body.adminNotes,
      refundAmount:
        body.refundAmount === undefined || body.refundAmount === null
          ? undefined
          : Number(body.refundAmount),
      refundMethod: body.refundMethod,
      trackingNumber: body.trackingNumber,
      courierName: body.courierName,
      actor: guard.actor,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, returnRequest: result.data });
  } catch (error) {
    console.error('Error updating return request:', error);
    return NextResponse.json(
      { error: 'Failed to update return request' },
      { status: 500 },
    );
  }
}

/** Retained so the previous `PUT` callers keep working. */
export const PUT = PATCH;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const { id } = await context.params;
    const result = await deleteReturnRequests([id], guard.actor);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, ...result.data });
  } catch (error) {
    console.error('Error deleting return request:', error);
    return NextResponse.json(
      { error: 'Failed to delete return request' },
      { status: 500 },
    );
  }
}
