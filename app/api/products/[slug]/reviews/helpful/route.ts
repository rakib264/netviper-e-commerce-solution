import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Records a "was this helpful" vote on an embedded review.
 * Votes are anonymous; the client guards against repeat votes locally.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { reviewId, vote } = await request.json();

    if (!reviewId || (vote !== 'up' && vote !== 'down')) {
      return NextResponse.json(
        { error: 'reviewId and a vote of "up" or "down" are required' },
        { status: 400 }
      );
    }

    const { slug } = await context.params;
    const field = vote === 'up' ? 'reviews.$.helpful' : 'reviews.$.notHelpful';

    const result = await Product.updateOne(
      { slug, 'reviews._id': reviewId },
      { $inc: { [field]: 1 } }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Review helpful vote error:', error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}
