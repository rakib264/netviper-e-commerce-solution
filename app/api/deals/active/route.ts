import { SCHEDULED_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedActiveDeals } from '@/lib/home/storefront-content';
import { NextResponse } from 'next/server';

/**
 * Every deal that is running right now, described for display.
 *
 * The engine is asked to price an empty cart, which is exactly the question a
 * shopfront advert asks: what is on offer, and what does it take? Progress comes
 * back at zero, so the caller gets each deal's target and reward without this
 * route re-deriving copy the cart already knows how to build. A gift the
 * catalogue cannot ship is skipped by the engine, so nothing unfulfillable is
 * ever advertised, and only deals inside their window are loaded at all.
 *
 * Pricing an empty cart is the same answer for every visitor, so it is cached and
 * shared rather than recomputed per request — with a short window, because a
 * deal's window closes on a clock.
 */
export async function GET() {
  try {
    const deals = await getCachedActiveDeals();

    return NextResponse.json(
      { deals },
      { headers: { 'Cache-Control': SCHEDULED_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Active deals lookup error:', error);
    return NextResponse.json({ error: 'Failed to load active deals' }, { status: 500 });
  }
}
