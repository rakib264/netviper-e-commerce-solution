import { auth } from '@/lib/auth';
import { createAuditLog, getClientIP } from '@/lib/audit';
import { DEFAULT_STOREFRONT_COPY } from '@/lib/deals/copy';
import { dealStatus, type DealStatus } from '@/lib/deals/status';
import { toDealDefinition } from '@/lib/deals/service';
import { normalizeDealPayload, validateDealPayload } from '@/lib/deals/validate-payload';
import Deal from '@/lib/models/Deal';
import OrderAppliedDeal from '@/lib/models/OrderAppliedDeal';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const rewardType = searchParams.get('rewardType') || '';
    const status = (searchParams.get('status') || '') as DealStatus | '';

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (rewardType) query.rewardType = rewardType;

    const docs = await Deal.find(query).sort({ priority: 1, createdAt: -1 }).lean();

    // Redemption counts come from the immutable order rows rather than the
    // deal's own counter, so an edited deal still reports its real history.
    const redemptions = await OrderAppliedDeal.aggregate([
      { $match: { deal: { $in: docs.map((doc: any) => doc._id) }, reversedAt: null } },
      { $group: { _id: '$deal', count: { $sum: 1 } } },
    ]);
    const redemptionsByDeal = new Map(
      redemptions.map((row: any) => [String(row._id), row.count as number])
    );

    const now = new Date();
    const deals = docs
      .map((doc: any) => ({
        ...toDealDefinition(doc),
        status: dealStatus(toDealDefinition(doc), now),
        redemptions: redemptionsByDeal.get(String(doc._id)) ?? 0,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }))
      // Status is derived, so it has to be filtered after the fact rather than
      // in the query.
      .filter((deal) => !status || deal.status === status);

    return NextResponse.json({ deals, defaultCopy: DEFAULT_STOREFRONT_COPY });
  } catch (error) {
    console.error('Deals API error:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();
    const errors = validateDealPayload(data);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0], errors }, { status: 400 });
    }

    const deal = await Deal.create({
      ...normalizeDealPayload(data),
      createdBy: session.user.id,
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'Deal',
      resourceId: deal._id.toString(),
      metadata: { name: deal.name, rewardType: deal.rewardType, settleOn: deal.settleOn },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Create deal error:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
