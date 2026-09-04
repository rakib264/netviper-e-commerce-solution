import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedHeroSlides } from '@/lib/home/storefront-content';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Public active hero carousel slides.
 *
 * The homepage no longer calls this — it reads `getCachedHeroSlides` directly
 * during the server render — but the carousel keeps it as its fallback for
 * mounts outside that path, and it shares the same cache entry, so a hit here
 * costs no database work.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 20) : 10;

    const banners = await getCachedHeroSlides(limit);

    return NextResponse.json(
      { banners },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Error fetching public banners:', error);
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}
