import { SCHEDULED_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedLandingEvents } from '@/lib/home/storefront-content';
import { NextResponse } from 'next/server';

/**
 * Events running right now that the admin flagged for the landing page.
 *
 * The schedule window is applied in the cached reader, which carries a short
 * revalidate for exactly that reason: visibility here turns on a clock rather
 * than on an edit.
 */
export async function GET() {
  try {
    const events = await getCachedLandingEvents(5);

    return NextResponse.json(
      { events, total: events.length },
      { headers: { 'Cache-Control': SCHEDULED_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Landing events API error:', error);
    return NextResponse.json({ error: 'Failed to fetch landing events' }, { status: 500 });
  }
}
