import Event from '@/lib/models/Event';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'upcoming', 'all'
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query for public events
    const query: any = { isActive: true };

    const now = new Date();

    // Filter by status if specified
    if (status === 'active') {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === 'upcoming') {
      query.startDate = { $gt: now };
    }
    // 'all' or no status means all active events regardless of timing

    const events = await Event.find(query)
      // `variants` and `images` come along so an event card can offer the same
      // colour swatches and hover gallery as the listing card; without them a
      // product with three colourways rendered as a single still.
      .populate(
        'products',
        'name thumbnailImage price comparePrice slug averageRating totalReviews isActive quantity variants images isNewArrival isFeatured isLimitedEdition',
      )
      .sort({ startDate: 1 }) // Sort by start date ascending
      .limit(limit)
      .lean();

    // Filter out inactive products and add computed status
    const eventsWithStatus = events.map((event: any) => {
      // Filter to only include active products
      const activeProducts = (event.products || []).filter((product: any) => product.isActive);

      // Compute status
      let computedStatus = 'inactive';
      if (event.isActive) {
        if (now < new Date(event.startDate)) {
          computedStatus = 'upcoming';
        } else if (now > new Date(event.endDate)) {
          computedStatus = 'expired';
        } else {
          computedStatus = 'active';
        }
      }

      return {
        ...event,
        products: activeProducts,
        productsCount: activeProducts.length,
        status: computedStatus
      };
    });

    return NextResponse.json({
      events: eventsWithStatus,
      total: eventsWithStatus.length
    });
  } catch (error) {
    console.error('Public events API error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
