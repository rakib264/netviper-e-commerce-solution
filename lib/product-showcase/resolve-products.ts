import type { ShowcaseProduct } from '@/lib/product-showcase/types';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import mongoose from 'mongoose';

const SWATCH_HEX: Record<string, string> = {
  black: '#1A1A1A',
  white: '#F5F5F3',
  cream: '#F0E6D8',
  beige: '#D6C4A8',
  brown: '#6B4F3A',
  tan: '#C4A484',
  red: '#B33A3A',
  blue: '#3A5A8C',
  navy: '#1B2A4A',
  green: '#3F6B4F',
  pink: '#E8B4B8',
  grey: '#8C8A85',
  gray: '#8C8A85',
  gold: '#C9A227',
  silver: '#C0C0C0',
};

function swatchColor(label: string): string {
  const key = label.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  const exact = SWATCH_HEX[key];
  if (exact) return exact;
  const partial = Object.keys(SWATCH_HEX).find((name) => key.includes(name));
  return partial ? SWATCH_HEX[partial] : '#D6D3CD';
}

function mapProduct(doc: any): ShowcaseProduct {
  const images = Array.from(
    new Set(
      [doc.thumbnailImage, ...(doc.images || [])]
        .filter(Boolean)
        .map((u: string) => String(u))
    )
  ) as string[];

  const categoryName =
    typeof doc.category === 'object' && doc.category?.name
      ? String(doc.category.name)
      : 'Shop';
  const categorySlug =
    typeof doc.category === 'object' && doc.category?.slug
      ? String(doc.category.slug)
      : '';

  const rawVariants = Array.isArray(doc.variants) ? doc.variants : [];
  const colorVariants = rawVariants.filter((v: any) =>
    /colou?r/i.test(String(v.attributeName || v.name || ''))
  );
  // Fallback: if no explicit color attribute, still expose variants that have images
  const variantSource =
    colorVariants.length > 0
      ? colorVariants
      : rawVariants.filter(
          (v: any) => v.thumbnailImage || v.image || v.attributeValue || v.value
        );

  const variants = variantSource.map((v: any, index: number) => {
    const label = String(v.attributeValue || v.value || v.name || `Option ${index + 1}`);
    const mediaUrls = Array.isArray(v.media)
      ? v.media
          .filter((m: any) => m?.type === 'image' && m?.url)
          .map((m: any) => String(m.url))
      : [];
    const image =
      String(v.thumbnailImage || v.image || '') || mediaUrls[0] || '';
    return {
      id: String(v.id || `${doc._id}-v-${index}`),
      label,
      value: `${label.toLowerCase().replace(/\s+/g, '_')}-${index}`,
      color: swatchColor(label),
      image,
      price: typeof v.price === 'number' ? v.price : undefined,
    };
  });

  // Ensure product.images includes variant images so hover has a secondary frame
  const variantImages = variants
    .map((v: { image?: string }) => v.image)
    .filter(Boolean);
  const mergedImages = Array.from(
    new Set([...images, ...variantImages])
  ) as string[];

  const badges: ShowcaseProduct['badges'] = [];
  const compare = Number(doc.comparePrice || 0);
  const price = Number(doc.price || 0);
  if (compare > price && price > 0) {
    badges.push({ text: 'Sale', color: '#B33A3A' });
  }
  if (doc.isNewArrival) {
    badges.push({ text: 'New', color: '#55534E' });
  } else if (doc.isFeatured) {
    badges.push({ text: 'Bestseller', color: '#1A1A1A' });
  } else if (doc.isLimitedEdition) {
    badges.push({ text: 'Limited', color: '#1A1A1A' });
  }

  return {
    _id: String(doc._id),
    name: String(doc.name || ''),
    slug: String(doc.slug || ''),
    href: `/products/${doc.slug}`,
    category: {
      label: categoryName,
      link: categorySlug ? `/categories/${categorySlug}` : '/products',
    },
    images: mergedImages.length > 0 ? mergedImages : ['/placeholder-product.jpg'],
    price,
    comparePrice: compare > price ? compare : undefined,
    badges: badges.length ? badges : undefined,
    variants: variants.length ? variants : undefined,
    isNewArrival: Boolean(doc.isNewArrival),
    isFeatured: Boolean(doc.isFeatured),
    isLimitedEdition: Boolean(doc.isLimitedEdition),
  };
}

const PRODUCT_SELECT =
  'name slug price comparePrice thumbnailImage images variants isActive isFeatured isNewArrival isLimitedEdition category averageRating totalSales createdAt';

export interface ProductSourceQuery {
  source: string;
  categorySlug?: string;
  productIds?: string[];
  limit: number;
  /** Ids already placed by another pass — used to top up a hybrid section. */
  excludeIds?: string[];
}

export async function queryProductsBySource(
  options: ProductSourceQuery,
): Promise<ShowcaseProduct[]> {
  return queryBySource(options);
}

async function queryBySource(options: ProductSourceQuery): Promise<ShowcaseProduct[]> {
  const limit = Math.max(1, Math.min(24, options.limit || 8));
  const base: Record<string, unknown> = { isActive: true };

  const excluded = (options.excludeIds || []).filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (excluded.length) {
    base._id = {
      $nin: excluded.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  if (options.source === 'manual' && options.productIds?.length) {
    const ids = options.productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (!ids.length) return [];
    // A manual pass names its ids outright, so the exclusion list is moot here.
    const docs = await Product.find({ isActive: true, _id: { $in: ids } })
      .select(PRODUCT_SELECT)
      .populate('category', 'name slug')
      .lean();
    const byId = new Map(docs.map((d: any) => [String(d._id), d]));
    return ids
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map(mapProduct);
  }

  const filter: Record<string, unknown> = { ...base };
  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  switch (options.source) {
    case 'featured':
      filter.isFeatured = true;
      break;
    case 'new-arrivals':
      filter.isNewArrival = true;
      break;
    case 'best-selling':
      // Straight off the sales counter the order pipeline increments.
      sort = { totalSales: -1, createdAt: -1 };
      break;
    case 'limited-edition':
      filter.isLimitedEdition = true;
      break;
    case 'category': {
      if (options.categorySlug) {
        const cat = (await Category.findOne({
          slug: options.categorySlug,
          isActive: true,
        })
          .select('_id')
          .lean()) as { _id: mongoose.Types.ObjectId } | null;
        if (cat?._id) filter.category = cat._id;
        else return [];
      }
      break;
    }
    default:
      break;
  }

  const docs = await Product.find(filter)
    .select(PRODUCT_SELECT)
    .populate('category', 'name slug')
    .sort(sort)
    .limit(limit)
    .lean();

  return docs.map(mapProduct);
}

export async function resolveTabProducts(tab: {
  productSource: string;
  categorySlug?: string;
  productIds?: string[];
  limit?: number;
}): Promise<ShowcaseProduct[]> {
  return queryBySource({
    source: tab.productSource || 'latest',
    categorySlug: tab.categorySlug,
    productIds: tab.productIds,
    limit: tab.limit || 8,
  });
}

export async function resolveProductById(
  productId?: string
): Promise<ShowcaseProduct | null> {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return null;
  const docs = await queryBySource({
    source: 'manual',
    productIds: [productId],
    limit: 1,
  });
  return docs[0] || null;
}

export { mapProduct };
