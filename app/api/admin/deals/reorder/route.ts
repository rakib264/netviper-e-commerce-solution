import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import Deal from '@/lib/models/Deal';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateDeals } from '@/lib/cache/revalidate';

const ALLOWED_ROLES = ['admin', 'manager'];

/**
 * Rewrites priorities from a dragged order. The list sends the full ordered id
 * array, so priorities are renumbered densely rather than patched — the order
 * on screen is the order the engine evaluates.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { order } = await request.json();

    if (!Array.isArray(order) || order.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return NextResponse.json({ error: 'A list of deal ids is required' }, { status: 400 });
    }

    await Deal.bulkWrite(
      order.map((id: string, index: number) => ({
        updateOne: { filter: { _id: id }, update: { $set: { priority: (index + 1) * 10 } } },
      }))
    );

    // `bulkWrite` bypasses Mongoose middleware, so the schema-level
    // invalidation never fires for a reorder — it is done by hand here.
    revalidateDeals();

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'Deal',
      metadata: { action: 'reorder', count: order.length },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ message: 'Priority updated' });
  } catch (error) {
    console.error('Reorder deals error:', error);
    return NextResponse.json({ error: 'Failed to reorder deals' }, { status: 500 });
  }
}
