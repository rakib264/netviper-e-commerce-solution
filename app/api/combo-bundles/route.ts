import { findLiveComboBundles } from '@/lib/combo-bundles/resolve';
import { SCHEDULED_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedComboBundles } from '@/lib/home/storefront-content';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Public list of live combo/bundle offers.
 *
 * "Live" means active *and* inside its schedule window — the schedule is
 * enforced here rather than in the client, so a scheduled offer cannot be read
 * out of a cached payload before it opens.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit'));
    const typeParam = searchParams.get('type');

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 24;
    const featuredOnly = searchParams.get('featured') === 'true';
    const comboType =
      typeParam === 'combo' || typeParam === 'bundle' ? typeParam : undefined;

    // The unfiltered list is what the storefront asks for and what the server
    // render already holds, so it reads through the shared cache. A `type`
    // filter is rare enough not to be worth its own cache entry.
    const comboBundles = comboType
      ? await findLiveComboBundles({ limit, featuredOnly, comboType })
      : await getCachedComboBundles(limit, featuredOnly);

    return NextResponse.json(
      { comboBundles, total: comboBundles.length },
      {
        // Short and revalidating: stock and component prices move underneath
        // these, so a long cache would advertise a sold-out offer.
        headers: { 'Cache-Control': SCHEDULED_CONTENT_CACHE_HEADER },
      },
    );
  } catch (error) {
    console.error('combo-bundles public GET', error);
    return NextResponse.json({ comboBundles: [], total: 0 }, { status: 200 });
  }
}
