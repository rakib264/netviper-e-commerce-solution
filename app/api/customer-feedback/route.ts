import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedCustomerFeedback } from '@/lib/home/storefront-content';
import { NextRequest, NextResponse } from 'next/server';

/** Active customer feedback for public display. */
export async function GET(request: NextRequest) {
  try {
    const requested = parseInt(request.nextUrl.searchParams.get('limit') || '6', 10);
    const limit =
      Number.isFinite(requested) && requested > 0 ? Math.min(requested, 50) : 6;

    const feedbacks = await getCachedCustomerFeedback(limit);

    return NextResponse.json(
      { feedbacks },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Error fetching customer feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer feedback' },
      { status: 500 },
    );
  }
}
