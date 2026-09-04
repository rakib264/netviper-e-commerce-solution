import { auth } from '@/lib/auth';
import { canClaimPoints } from '@/lib/deals/rewards';
import { pointsBalances } from '@/lib/deals/settlement';
import Deal from '@/lib/models/Deal';
import MysteryBox from '@/lib/models/MysteryBox';
import PointsLedger from '@/lib/models/PointsLedger';
import PunchCard from '@/lib/models/PunchCard';
import connectDB from '@/lib/mongodb';
import { NextResponse } from 'next/server';

/**
 * Everything the profile's Rewards tab renders: the points wallet with its
 * ledger, the punch cards, and any mystery box waiting to be opened.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const customerId = session.user.id;

    const [balances, ledger, cards, boxes] = await Promise.all([
      pointsBalances(customerId),
      PointsLedger.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('deal', 'name')
        .lean(),
      PunchCard.find({ customer: customerId }).populate('deal', 'name storefrontCopy').lean(),
      MysteryBox.find({ customer: customerId, status: { $ne: 'revealed' } })
        .populate('deal', 'name')
        .lean(),
    ]);

    // The claim threshold is a property of the points deals themselves. With
    // several running, the lowest one is what actually gates the wallet.
    const pointsDeals = await Deal.find({ rewardType: 'LOYALTY_POINTS' })
      .select('rewardConfig')
      .lean();
    const thresholds = (pointsDeals as any[])
      .map((deal) => Number(deal.rewardConfig?.minClaimThreshold) || 0)
      .filter((value) => value > 0);
    const minClaimThreshold = thresholds.length > 0 ? Math.min(...thresholds) : 0;

    const revealed = await MysteryBox.find({ customer: customerId, status: 'revealed' })
      .sort({ revealedAt: -1 })
      .limit(10)
      .populate('revealedProductId', 'name thumbnailImage slug')
      .lean();

    return NextResponse.json({
      points: {
        ...balances,
        minClaimThreshold,
        claim: canClaimPoints(balances.available, minClaimThreshold),
        ledger: (ledger as any[]).map((row) => ({
          id: String(row._id),
          points: row.points,
          status: row.status,
          entryType: row.entryType,
          dealName: row.deal?.name || row.note || null,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
        })),
      },
      punchCards: (cards as any[]).map((card) => ({
        id: String(card._id),
        dealId: String(card.deal?._id || card.deal),
        dealName: card.deal?.name || '',
        punches: card.punches,
        target: card.target,
        completedCount: card.completedCount,
        cardStartedAt: card.cardStartedAt,
      })),
      mysteryBoxes: (boxes as any[]).map((box) => ({
        id: String(box._id),
        dealName: box.deal?.name || '',
        status: box.status,
      })),
      revealedBoxes: (revealed as any[]).map((box) => ({
        id: String(box._id),
        dealName: box.deal?.name || '',
        productName: box.revealedProductId?.name || null,
        productImage: box.revealedProductId?.thumbnailImage || null,
        productSlug: box.revealedProductId?.slug || null,
        revealedAt: box.revealedAt,
      })),
    });
  } catch (error) {
    console.error('Rewards GET error:', error);
    return NextResponse.json({ error: 'Failed to load rewards' }, { status: 500 });
  }
}
