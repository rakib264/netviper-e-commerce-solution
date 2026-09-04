import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import { dealStatus } from '@/lib/deals/status';
import { toDealDefinition } from '@/lib/deals/service';
import { normalizeDealPayload, validateDealPayload } from '@/lib/deals/validate-payload';
import Deal from '@/lib/models/Deal';
import OrderAppliedDeal from '@/lib/models/OrderAppliedDeal';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;
    const doc = await Deal.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    const definition = toDealDefinition(doc);
    return NextResponse.json({
      deal: { ...definition, status: dealStatus(definition) },
    });
  } catch (error) {
    console.error('Get deal error:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;
    const data = await request.json();

    const existing = await Deal.findById(id);
    if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    // A bare `{ isActive }` body is the list view's toggle, not a full save.
    const isToggleOnly = Object.keys(data).length === 1 && 'isActive' in data;
    if (isToggleOnly) {
      existing.isActive = data.isActive === true;
      await existing.save();
      await createAuditLog({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'Deal',
        resourceId: id,
        changes: [{ field: 'isActive', oldValue: !existing.isActive, newValue: existing.isActive }],
        metadata: { name: existing.name },
        ipAddress: getClientIP(request),
      });
      return NextResponse.json({ deal: toDealDefinition(existing) });
    }

    const errors = validateDealPayload(data);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], errors }, { status: 400 });
    }

    const before = toDealDefinition(existing);
    Object.assign(existing, normalizeDealPayload(data));
    await existing.save();
    const after = toDealDefinition(existing);

    const tracked = ['name', 'isActive', 'priority', 'isExclusive', 'triggerValue', 'rewardType'] as const;
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'Deal',
      resourceId: id,
      changes: tracked
        .filter((field) => before[field] !== after[field])
        .map((field) => ({ field, oldValue: before[field], newValue: after[field] })),
      metadata: { name: after.name },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ deal: after });
  } catch (error) {
    console.error('Update deal error:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    const deal = await Deal.findById(id);
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    // Orders reference the deal for their reward history. Deleting the row
    // would orphan a customer's pending points, so a used deal is retired by
    // being switched off instead.
    const redemptions = await OrderAppliedDeal.countDocuments({ deal: id });
    if (redemptions > 0) {
      return NextResponse.json(
        {
          error: `This deal has ${redemptions} redemption${redemptions === 1 ? '' : 's'} and cannot be deleted. Switch it off instead.`,
        },
        { status: 409 }
      );
    }

    await Deal.deleteOne({ _id: id });

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      resource: 'Deal',
      resourceId: id,
      metadata: { name: deal.name, rewardType: deal.rewardType },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ message: 'Deal deleted' });
  } catch (error) {
    console.error('Delete deal error:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
