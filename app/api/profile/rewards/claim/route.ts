import { auth } from '@/lib/auth';
import { canClaimPoints } from '@/lib/deals/rewards';
import { pointsBalances, redeemPoints } from '@/lib/deals/settlement';
import Deal from '@/lib/models/Deal';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Spends the customer's available points.
 *
 * The threshold is re-checked here rather than trusted from the disabled
 * button: a client can always post.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const customerId = session.user.id;

    const pointsDeals = await Deal.find({ rewardType: 'LOYALTY_POINTS' })
      .select('rewardConfig')
      .lean();
    const thresholds = (pointsDeals as any[])
      .map((deal) => Number(deal.rewardConfig?.minClaimThreshold) || 0)
      .filter((value) => value > 0);
    const minClaimThreshold = thresholds.length > 0 ? Math.min(...thresholds) : 0;

    const balances = await pointsBalances(customerId);
    const check = canClaimPoints(balances.available, minClaimThreshold);
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'Not enough points to redeem yet', shortfall: check.shortfall },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requested = Number(body?.points) > 0 ? Math.floor(Number(body.points)) : balances.available;
    if (requested > balances.available) {
      return NextResponse.json({ error: 'Not enough points to redeem yet' }, { status: 400 });
    }

    await redeemPoints(customerId, requested, 'Redeemed from the points wallet');

    return NextResponse.json({
      message: 'Points redeemed',
      points: requested,
      balances: await pointsBalances(customerId),
    });
  } catch (error) {
    console.error('Rewards claim error:', error);
    return NextResponse.json({ error: 'Failed to redeem points' }, { status: 500 });
  }
}
