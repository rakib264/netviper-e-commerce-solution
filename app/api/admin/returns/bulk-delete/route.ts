import { requireReturnsAdmin } from '@/lib/returns/admin-guard';
import { deleteReturnRequests } from '@/lib/returns/service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Delete several return requests at once.
 *
 * Previously deleted from `ReturnExchangeRequest` — a separate, unused
 * collection — while every other returns endpoint read and wrote
 * `ReturnRequest`. So it authenticated, reported success, and removed nothing.
 * It now goes through the same service as the single delete, which means it also
 * writes the audit entry that was missing.
 */
const bulkDeleteSchema = z.object({
  /** Mongo `_id`s or human `requestId`s; the service resolves either. */
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required').max(100),
});

export async function DELETE(request: NextRequest) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: guard.error },
      { status: guard.status },
    );
  }

  try {
    const { ids } = bulkDeleteSchema.parse(await request.json());
    const result = await deleteReturnRequests(ids, guard.actor);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, ...result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Error bulk deleting return requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete requests' },
      { status: 500 },
    );
  }
}
