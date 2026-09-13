import { auth } from '@/lib/auth';
import { syncCourierStatus } from '@/lib/courier/dispatch';
import { NextRequest, NextResponse } from 'next/server';

/** Refreshes one consignment's status from its provider. */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await syncCourierStatus(id);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error('Courier status sync error:', error);
    return NextResponse.json({ error: 'Failed to sync courier status' }, { status: 500 });
  }
}
