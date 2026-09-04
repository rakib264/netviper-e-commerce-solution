import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedShowcaseSections } from '@/lib/home/storefront-content';
import { NextResponse } from 'next/server';

/** Public product-showcase sections, with every tab and split panel resolved. */
export async function GET() {
  try {
    const sections = await getCachedShowcaseSections();

    return NextResponse.json(
      { sections },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('product-showcase public GET', error);
    return NextResponse.json({ sections: [] }, { status: 200 });
  }
}
