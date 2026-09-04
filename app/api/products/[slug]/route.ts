import { getSessionFromCookies } from '@/lib/auth';
import { PUBLIC_CONTENT_CACHE_HEADER, PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import {
  getCachedProductDetail,
  getPublicProductDetail,
} from '@/lib/products/detail-server';
import { NextRequest, NextResponse } from 'next/server';

function hasAdminAccess(role: string): boolean {
  return ['admin', 'manager', 'super-admin'].includes(role);
}

/**
 * One product with its related set.
 *
 * Reads through the same cache entry the product page's server render uses, so
 * a page view costs one database read of the document rather than three.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;

    const session = await getSessionFromCookies();
    const hasAccess = hasAdminAccess(session?.user?.role || '');

    const payload = hasAccess
      ? await getCachedProductDetail(slug)
      : await getPublicProductDetail(slug);

    if (!payload.product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(payload, {
      headers: {
        // An admin response carries the confidential fields, so it must never
        // land in a shared cache.
        'Cache-Control': hasAccess ? PRIVATE_CACHE_HEADER : PUBLIC_CONTENT_CACHE_HEADER,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
