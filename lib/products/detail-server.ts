import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_TAGS } from '@/lib/cache/tags';
import { toPlainJson } from '@/lib/home/serialize';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';

/**
 * A product detail page's data, resolved once.
 *
 * The same document used to be read three times for one page view:
 * `generateMetadata` fetched it, the page component fetched it again for the
 * JSON-LD block, and then `ProductPageClient` fetched `/api/products/[slug]`
 * after hydration for the content the visitor actually sees. All three now go
 * through this cache entry, so the first one pays and the rest are free — and
 * the third is gone entirely, because the page passes the product straight into
 * the client component.
 */

/** Confidential regardless of caller. SKU and dimensions are public: the PDP shows them. */
const CONFIDENTIAL_FIELDS = ['cost', 'barcode', 'totalSales'] as const;

export interface ProductDetailPayload {
  product: Record<string, any> | null;
  relatedProducts: Array<Record<string, any>>;
}

const RELATED_FIELDS =
  'name slug price comparePrice thumbnailImage images variants quantity averageRating totalReviews category';

export const getCachedProductDetail = unstable_cache(
  async (slug: string): Promise<ProductDetailPayload> => {
    await connectDB();

    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug')
      .populate('reviews.user', 'firstName lastName')
      .lean<Record<string, any> | null>();

    if (!product) return { product: null, relatedProducts: [] };

    // Sequential by necessity: the related set is scoped to this product's
    // category, which is only known once the product is read.
    const relatedProducts = await Product.find({
      category: product.category?._id,
      _id: { $ne: product._id },
      isActive: true,
    })
      .select(RELATED_FIELDS)
      .populate('category', 'name slug')
      .limit(4)
      .lean();

    return toPlainJson({ product, relatedProducts });
  },
  ['product-detail-v1'],
  { tags: [CACHE_TAGS.products], revalidate: 300 },
);

/**
 * The same payload with the confidential fields stripped.
 *
 * Applied on read rather than baked into the cached value, so admin and public
 * callers share one cache entry instead of warming two.
 */
export async function getPublicProductDetail(
  slug: string,
): Promise<ProductDetailPayload> {
  const { product, relatedProducts } = await getCachedProductDetail(slug);
  if (!product) return { product: null, relatedProducts: [] };

  const publicProduct = { ...product };
  for (const field of CONFIDENTIAL_FIELDS) delete publicProduct[field];

  return {
    product: publicProduct,
    relatedProducts: relatedProducts.map(({ totalSales: _totalSales, ...rest }) => rest),
  };
}
