import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedCuratedSections } from '@/lib/home/storefront-content';
import { NextResponse } from 'next/server';

/**
 * Public curated sections, with their products resolved.
 *
 * Every product goes through `toPublicProduct` in the cached reader, which drops
 * the `origin` field the admin preview uses. The internal provenance labels
 * ("Manual", "Auto Best-Selling") therefore cannot reach a customer — not in the
 * markup, and not in the JSON behind it.
 */
export async function GET() {
  try {
    const sections = await getCachedCuratedSections();

    return NextResponse.json(
      { sections },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('curated-sections public GET', error);
    return NextResponse.json({ sections: [] }, { status: 200 });
  }
}
