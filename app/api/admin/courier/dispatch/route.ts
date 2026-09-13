import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { dispatchCouriers } from '@/lib/courier/dispatch';
import { isCourierProviderId } from '@/lib/courier/providers';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sends one or more courier records to their provider.
 *
 * Accepts either `courierIds` or `orderIds` — the consignment board works in
 * courier records, while the orders screen only knows the order.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { provider, force } = body;

    if (provider !== undefined && !isCourierProviderId(provider)) {
      return NextResponse.json(
        { error: 'Unknown provider. Expected "pathao" or "steadfast".' },
        { status: 400 },
      );
    }

    let courierIds: string[] = Array.isArray(body.courierIds)
      ? body.courierIds.map(String)
      : [];

    if (!courierIds.length && Array.isArray(body.orderIds) && body.orderIds.length) {
      const couriers = await Courier.find({ order: { $in: body.orderIds } }).select('_id');
      courierIds = couriers.map((courier: any) => courier._id.toString());
    }

    if (!courierIds.length) {
      return NextResponse.json(
        { error: 'No courier records to dispatch. Confirm the order first.' },
        { status: 400 },
      );
    }

    const results = await dispatchCouriers(courierIds, {
      provider: isCourierProviderId(provider) ? provider : undefined,
      force: force === true,
    });

    const dispatched = results.filter((result) => result.ok && !result.skipped);
    const failed = results.filter((result) => !result.ok);

    await createAuditLog({
      userId: session.user.id,
      action: 'DISPATCH',
      resource: 'Courier',
      metadata: {
        requested: courierIds.length,
        dispatched: dispatched.length,
        skipped: results.filter((result) => result.skipped).length,
        failed: failed.length,
        provider: provider ?? 'default',
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      results,
      summary: {
        requested: courierIds.length,
        dispatched: dispatched.length,
        skipped: results.filter((result) => result.skipped).length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error('Courier dispatch error:', error);
    return NextResponse.json({ error: 'Failed to dispatch couriers' }, { status: 500 });
  }
}
