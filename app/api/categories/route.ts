import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedCategoryTree } from '@/lib/home/storefront-content';
import { NextResponse } from 'next/server';

/**
 * All active categories, excluding the retired seed tree and its children.
 *
 * Reads through the same cached aggregation the storefront's server renders use,
 * so this endpoint and the homepage never query the collection twice for the
 * same tree.
 */
export async function GET() {
  try {
    const categories = await getCachedCategoryTree();

    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
