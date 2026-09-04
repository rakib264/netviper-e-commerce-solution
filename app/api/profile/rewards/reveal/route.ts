import { auth } from '@/lib/auth';
import { drawFromPool } from '@/lib/deals/rewards';
import type { PunchCardConfig } from '@/lib/deals/types';
import Deal from '@/lib/models/Deal';
import MysteryBox from '@/lib/models/MysteryBox';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Opens a mystery box.
 *
 * The prize is drawn here rather than when the box was created, so a pool an
 * admin edited mid-campaign still applies. The claim on `status: 'available'`
 * makes a double-tap on the card a no-op instead of a second draw.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { boxId } = await request.json().catch(() => ({}));
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      return NextResponse.json({ error: 'A mystery box id is required' }, { status: 400 });
    }

    const box = await MysteryBox.findOne({ _id: boxId, customer: session.user.id });
    if (!box) return NextResponse.json({ error: 'Mystery box not found' }, { status: 404 });
    if (box.status === 'pending') {
      return NextResponse.json(
        { error: 'This box unlocks once your order is delivered' },
        { status: 409 }
      );
    }

    const deal = await Deal.findById(box.deal).select('rewardConfig').lean();
    const pool = ((deal as any)?.rewardConfig as PunchCardConfig)?.boxPool || [];
    const prize = drawFromPool(pool, Math.random());
    if (!prize) {
      return NextResponse.json({ error: 'This reward has no prizes configured' }, { status: 409 });
    }

    // Claim the box before recording the prize, so two taps cannot draw twice.
    const claimed = await MysteryBox.findOneAndUpdate(
      { _id: box._id, status: 'available' },
      {
        $set: {
          status: 'revealed',
          revealedProductId: prize.productId,
          revealedVariantId: prize.variantId ?? null,
          revealedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!claimed) {
      return NextResponse.json({ error: 'This box has already been opened' }, { status: 409 });
    }

    const product = await Product.findById(prize.productId)
      .select('name thumbnailImage slug')
      .lean();

    return NextResponse.json({
      box: {
        id: String(claimed._id),
        status: claimed.status,
        productName: (product as any)?.name || null,
        productImage: (product as any)?.thumbnailImage || null,
        productSlug: (product as any)?.slug || null,
        variantId: claimed.revealedVariantId,
      },
    });
  } catch (error) {
    console.error('Mystery box reveal error:', error);
    return NextResponse.json({ error: 'Failed to open the mystery box' }, { status: 500 });
  }
}
