import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import {
  getCachedNewestProducts,
  PRODUCT_CARD_FIELDS,
} from '@/lib/home/storefront-content';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const MAX_LIMIT = 48;
const UNBOUNDED_MAX_PRICE = 999999;

/**
 * Paginated product listing, projected down to what a product card renders.
 *
 * The common case — page one, no filters — is exactly what the homepage's
 * server render already holds, so it reads through the shared cache and costs no
 * database work. Anything filtered or paged past the first page queries
 * directly: those combinations are too many to be worth a cache entry each, and
 * page one is the only one on a critical path.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '12', 10);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 12),
    );

    const category = searchParams.get('category') || '';
    const minPrice = Number.parseFloat(searchParams.get('minPrice') || '0') || 0;
    const maxPrice =
      Number.parseFloat(searchParams.get('maxPrice') || String(UNBOUNDED_MAX_PRICE)) ||
      UNBOUNDED_MAX_PRICE;
    const inStock = searchParams.get('inStock') === 'true';

    const isDefaultQuery =
      page === 1 &&
      !category &&
      minPrice <= 0 &&
      maxPrice >= UNBOUNDED_MAX_PRICE &&
      !inStock;

    if (isDefaultQuery) {
      const products = await getCachedNewestProducts(limit);
      return NextResponse.json(
        {
          success: true,
          products,
          pagination: {
            page,
            limit,
            // `hasMore` is answered by asking for one row past the page rather
            // than by counting the whole collection: a full `countDocuments`
            // for a "load more" button is work the answer never needed.
            total: null,
            pages: null,
            hasMore: products.length === limit,
          },
        },
        { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
      );
    }

    await connectDB();

    const query: Record<string, unknown> = { isActive: true };

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category })
        .select('_id')
        .lean<{ _id: unknown } | null>();
      // An unknown slug must not silently widen to the whole catalogue.
      if (!categoryDoc) {
        return NextResponse.json({
          success: true,
          products: [],
          pagination: { page, limit, total: 0, pages: 0, hasMore: false },
        });
      }
      query.category = categoryDoc._id;
    }

    if (minPrice > 0 || maxPrice < UNBOUNDED_MAX_PRICE) {
      query.price = { $gte: minPrice, $lte: maxPrice };
    }

    if (inStock) query.quantity = { $gt: 0 };

    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Product.find(query)
        .select(PRODUCT_CARD_FIELDS)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        // One past the page, so `hasMore` needs no second query.
        .limit(limit + 1)
        .lean(),
      Product.countDocuments(query),
    ]);

    const hasMore = rows.length > limit;
    const products = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json(
      {
        success: true,
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore,
        },
      },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Products list API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        products: [],
        pagination: { page: 1, limit: 12, total: 0, pages: 0, hasMore: false },
      },
      { status: 500 },
    );
  }
}
