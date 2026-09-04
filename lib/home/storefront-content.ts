import 'server-only';

import { unstable_cache } from 'next/cache';

import { toAdvertisementDTO, type AdvertisementDTO } from '@/lib/advertisements/types';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { findLiveComboBundles } from '@/lib/combo-bundles/resolve';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { resolveCuratedProducts } from '@/lib/curated-sections/resolve';
import type { ResolvedCuratedSection } from '@/lib/curated-sections/client-types';
import {
  resolveCtaHref,
  toCuratedSection,
  toPublicProduct,
} from '@/lib/curated-sections/types';
import { recalculateCartForRequest } from '@/lib/deals/service';
import { buildActiveDealSummaries, type ActiveDealSummary } from '@/lib/deals/showcase';
import type { HeroSlide } from '@/lib/hero-carousel/types';
import { toPlainJson } from '@/lib/home/serialize';
import type {
  StorefrontCategory,
  StorefrontFeedback,
  StorefrontProductCard,
} from '@/lib/home/homepage-types';
import Advertisement from '@/lib/models/Advertisement';
import Banner from '@/lib/models/Banner';
import Category from '@/lib/models/Category';
import CuratedSection from '@/lib/models/CuratedSection';
import CustomerFeedback from '@/lib/models/CustomerFeedback';
import Event from '@/lib/models/Event';
import Product from '@/lib/models/Product';
import ProductShowcaseSection from '@/lib/models/ProductShowcaseSection';
import connectDB from '@/lib/mongodb';
import { serializeShowcaseSection } from '@/lib/product-showcase/normalize';
import {
  resolveProductById,
  resolveTabProducts,
} from '@/lib/product-showcase/resolve-products';
import { sortCategories } from '@/lib/categories/sort';

/**
 * Cached server reads for every piece of storefront content the homepage shows.
 *
 * One reader per collection, each wrapped in `unstable_cache` and tagged, so
 * that:
 *
 *   - the server render, the public API route and any client refetch all share
 *     a single cache entry instead of each paying for the same query;
 *   - an admin save invalidates exactly the readers it affects, by tag, and the
 *     next render is fresh — no waiting out a TTL;
 *   - the `revalidate` windows below are a backstop for writes that happen
 *     outside an admin route (a script, the queue worker), not the primary
 *     freshness mechanism.
 *
 * Schedule-sensitive content (deals, events, combo offers) carries a short
 * window because its visibility turns on a clock rather than on an edit: a
 * five-minute cache would keep advertising an offer for five minutes after it
 * closed.
 */

/** Content that only changes when an admin edits it. */
const EDITORIAL_REVALIDATE = 300;
/** Content whose visibility depends on the current time. */
const SCHEDULED_REVALIDATE = 60;

/* ── Hero carousel ──────────────────────────────────────────────────────── */

const HERO_SLIDE_FIELDS =
  'title subtitle description image backgroundVideo ctaButtons ctaButtonLabel ctaButtonUrl products productId productSlug productImage productName rating price comparePrice order';

export const getCachedHeroSlides = unstable_cache(
  async (limit: number): Promise<HeroSlide[]> => {
    await connectDB();
    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .limit(limit)
      .select(HERO_SLIDE_FIELDS)
      .lean();

    return toPlainJson(banners) as unknown as HeroSlide[];
  },
  ['storefront-hero-slides-v1'],
  { tags: [CACHE_TAGS.banners], revalidate: EDITORIAL_REVALIDATE },
);

/* ── Categories ─────────────────────────────────────────────────────────── */

/**
 * Seed data from the store's previous incarnation. Excluded by slug rather than
 * deleted, because the documents are still referenced by historic orders.
 */
export const SEED_CATEGORY_SLUGS = [
  'electronics',
  'fashion',
  'home-living',
  'sports-fitness',
  'books-education',
  'health-beauty',
  'electronics-2',
  'mobile',
];

export const getCachedCategoryTree = unstable_cache(
  async (): Promise<StorefrontCategory[]> => {
    await connectDB();

    // One round trip instead of two: the old shape fetched the seed ids first,
    // then filtered children against them. `$lookup` resolves the parent in the
    // same pipeline, so the seed exclusion and the parent projection both happen
    // server-side in Mongo.
    const categories = await Category.aggregate([
      { $match: { isActive: true, slug: { $nin: SEED_CATEGORY_SLUGS } } },
      {
        $lookup: {
          from: 'categories',
          localField: 'parent',
          foreignField: '_id',
          as: 'parentDoc',
          pipeline: [{ $project: { name: 1, slug: 1 } }],
        },
      },
      { $addFields: { parentDoc: { $first: '$parentDoc' } } },
      // A child of a retired seed category is retired with it.
      { $match: { 'parentDoc.slug': { $nin: SEED_CATEGORY_SLUGS } } },
      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          image: 1,
          sortOrder: 1,
          parent: {
            $cond: [
              { $ifNull: ['$parentDoc', false] },
              {
                _id: '$parentDoc._id',
                name: '$parentDoc.name',
                slug: '$parentDoc.slug',
              },
              null,
            ],
          },
        },
      },
      { $sort: { sortOrder: 1, name: 1 } },
    ]);

    return toPlainJson(categories) as StorefrontCategory[];
  },
  ['storefront-category-tree-v1'],
  { tags: [CACHE_TAGS.categories], revalidate: EDITORIAL_REVALIDATE },
);

/** Top-level categories only, in display order — what the homepage tile grid shows. */
export const getCachedRootCategories = unstable_cache(
  async (limit: number): Promise<StorefrontCategory[]> => {
    const categories = await getCachedCategoryTree();
    return sortCategories(categories.filter((category) => !category.parent)).slice(
      0,
      limit,
    );
  },
  ['storefront-root-categories-v1'],
  { tags: [CACHE_TAGS.categories], revalidate: EDITORIAL_REVALIDATE },
);

/* ── Product grids ──────────────────────────────────────────────────────── */

/**
 * Exactly the fields a product card paints, and nothing else.
 *
 * The catalogue documents carry `description`, `reviews[]`, `cost`, `barcode`
 * and the full `media[]` array; a homepage grid of eight products was moving all
 * of it over the wire to render a name, a price and one image.
 */
export const PRODUCT_CARD_FIELDS =
  'name slug price comparePrice thumbnailImage images variants productSize quantity averageRating totalReviews shortDescription isFeatured isNewArrival isLimitedEdition category';

type ProductGridSort = 'newest' | 'best-selling';

async function readProductCards(options: {
  filter: Record<string, unknown>;
  limit: number;
  sort: ProductGridSort;
}): Promise<StorefrontProductCard[]> {
  await connectDB();
  const sort: Record<string, -1> =
    options.sort === 'best-selling'
      ? { totalSales: -1, createdAt: -1 }
      : { createdAt: -1 };

  const products = await Product.find({ isActive: true, ...options.filter })
    .select(PRODUCT_CARD_FIELDS)
    .populate('category', 'name slug')
    .sort(sort)
    .limit(options.limit)
    .lean();

  return toPlainJson(products) as unknown as StorefrontProductCard[];
}

/** Newest active products — the homepage listing band and `/products` page one. */
export const getCachedNewestProducts = unstable_cache(
  async (limit: number) => readProductCards({ filter: {}, limit, sort: 'newest' }),
  ['storefront-newest-products-v1'],
  { tags: [CACHE_TAGS.products], revalidate: EDITORIAL_REVALIDATE },
);

export const getCachedFeaturedProducts = unstable_cache(
  async (limit: number) =>
    readProductCards({ filter: { isFeatured: true }, limit, sort: 'newest' }),
  ['storefront-featured-products-v1'],
  { tags: [CACHE_TAGS.products], revalidate: EDITORIAL_REVALIDATE },
);

/* ── Advertisements ─────────────────────────────────────────────────────── */

export const getCachedAdvertisements = unstable_cache(
  async (): Promise<Record<'horizontal' | 'vertical', AdvertisementDTO[]>> => {
    await connectDB();
    const docs = await Advertisement.find({ isActive: true })
      .sort({ type: 1, position: 1 })
      .select('-__v')
      .lean();

    // Both families come back in one query and are split here: the homepage
    // shows both bands, so two round trips for two `type` values was one more
    // than the page needed.
    const grouped: Record<'horizontal' | 'vertical', AdvertisementDTO[]> = {
      horizontal: [],
      vertical: [],
    };

    for (const raw of docs as Array<Record<string, any>>) {
      const dto = toAdvertisementDTO(raw);
      // A card with no usable media would render an empty box.
      if (!dto.mediaUrl) continue;
      if (dto.type === 'horizontal' || dto.type === 'vertical') {
        grouped[dto.type].push(dto);
      }
    }

    return toPlainJson(grouped);
  },
  ['storefront-advertisements-v1'],
  { tags: [CACHE_TAGS.advertisements], revalidate: EDITORIAL_REVALIDATE },
);

/* ── Curated product bands ──────────────────────────────────────────────── */

export const getCachedCuratedSections = unstable_cache(
  async (): Promise<ResolvedCuratedSection[]> => {
    await connectDB();
    const sections = await CuratedSection.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const resolved = await Promise.all(
      (sections as Array<Record<string, any>>).map(async (raw) => {
        const section = toCuratedSection(raw);
        const products = await resolveCuratedProducts(section);
        return {
          ...section,
          ctaHref: resolveCtaHref(section),
          products: products.map(toPublicProduct),
        };
      }),
    );

    // A section that resolves to nothing is not worth a heading and a gap.
    return toPlainJson(
      resolved.filter((section) => section.products.length > 0),
    ) as unknown as ResolvedCuratedSection[];
  },
  ['storefront-curated-sections-v1'],
  {
    tags: [CACHE_TAGS.curatedSections, CACHE_TAGS.products],
    revalidate: EDITORIAL_REVALIDATE,
  },
);

/* ── Product showcase sections ──────────────────────────────────────────── */

export const getCachedShowcaseSections = unstable_cache(
  async () => {
    await connectDB();
    const docs = await ProductShowcaseSection.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // The stored template is resolved once, here: a section whose field was
    // written in another spelling used to fall through the check below and
    // render its split panels as an empty product carousel.
    const sections = docs.map((doc) =>
      serializeShowcaseSection(doc as Record<string, unknown>),
    );

    const resolved = await Promise.all(
      sections.map(async (section) => {
        if (section.template === 'split_media') {
          const [leftProduct, rightProduct] = await Promise.all([
            resolveProductById(section.splitLeft?.productId),
            resolveProductById(section.splitRight?.productId),
          ]);
          return {
            ...section,
            resolvedSplitLeftProduct: leftProduct,
            resolvedSplitRightProduct: rightProduct,
          };
        }

        const resolvedTabs = await Promise.all(
          (section.tabs || []).map(async (tab) => ({
            id: tab.id,
            title: tab.title,
            value: tab.value,
            promotion: tab.promotion,
            products: await resolveTabProducts(tab),
          })),
        );

        return { ...section, resolvedTabs };
      }),
    );

    return toPlainJson(resolved);
  },
  ['storefront-showcase-sections-v1'],
  {
    tags: [CACHE_TAGS.productShowcase, CACHE_TAGS.products],
    revalidate: EDITORIAL_REVALIDATE,
  },
);

/* ── Combo bundles ──────────────────────────────────────────────────────── */

export const getCachedComboBundles = unstable_cache(
  async (limit: number, featuredOnly: boolean): Promise<ResolvedComboBundle[]> => {
    const combos = await findLiveComboBundles({ limit, featuredOnly });
    return toPlainJson(combos);
  },
  ['storefront-combo-bundles-v1'],
  {
    tags: [CACHE_TAGS.comboBundles, CACHE_TAGS.products],
    revalidate: SCHEDULED_REVALIDATE,
  },
);

/* ── Landing events ─────────────────────────────────────────────────────── */

const EVENT_PRODUCT_FIELDS =
  'name thumbnailImage price comparePrice slug averageRating totalReviews isActive quantity variants images isNewArrival isFeatured isLimitedEdition';

export const getCachedLandingEvents = unstable_cache(
  async (limit: number) => {
    await connectDB();
    const now = new Date();

    const events = await Event.find({
      isActive: true,
      showInLanding: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      // `variants` and `images` come along so an event card can offer the same
      // colour swatches and hover gallery as the listing card; without them a
      // product with three colourways rendered as a single still.
      .populate('products', EVENT_PRODUCT_FIELDS)
      .sort({ startDate: -1 })
      .limit(limit)
      .lean();

    const withStatus = (events as Array<Record<string, any>>).map((event) => {
      const activeProducts = (event.products || []).filter(
        (product: any) => product?.isActive,
      );

      let status = 'inactive';
      if (event.isActive) {
        if (now < new Date(event.startDate)) status = 'upcoming';
        else if (now > new Date(event.endDate)) status = 'expired';
        else status = 'active';
      }

      return {
        ...event,
        products: activeProducts,
        productsCount: activeProducts.length,
        status,
      };
    });

    // An event with nothing left in stock is not an event.
    return toPlainJson(withStatus.filter((event) => event.products.length > 0));
  },
  ['storefront-landing-events-v1'],
  {
    tags: [CACHE_TAGS.events, CACHE_TAGS.products],
    revalidate: SCHEDULED_REVALIDATE,
  },
);

/* ── Active deals ───────────────────────────────────────────────────────── */

export const getCachedActiveDeals = unstable_cache(
  async (): Promise<ActiveDealSummary[]> => {
    await connectDB();
    const now = new Date();
    // The engine is asked to price an empty cart, which is exactly the question
    // a shopfront advert asks: what is on offer, and what does it take?
    const { result, deals } = await recalculateCartForRequest({ lines: [], now });
    return toPlainJson(
      await buildActiveDealSummaries(result.dealProgress, deals, now),
    );
  },
  ['storefront-active-deals-v1'],
  { tags: [CACHE_TAGS.deals, CACHE_TAGS.products], revalidate: SCHEDULED_REVALIDATE },
);

/* ── Customer feedback ──────────────────────────────────────────────────── */

/** "3d", "2w" — coarse enough that a cached value never reads as wrong. */
function relativeAge(createdAt: unknown): string {
  const created = new Date(String(createdAt || ''));
  if (Number.isNaN(created.getTime())) return '';
  const hours = Math.floor((Date.now() - created.getTime()) / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h`;
  if (hours < 168) return `${Math.floor(hours / 24)}d`;
  return `${Math.floor(hours / 168)}w`;
}

export const getCachedCustomerFeedback = unstable_cache(
  async (limit: number): Promise<StorefrontFeedback[]> => {
    await connectDB();
    const feedbacks = await CustomerFeedback.find({ isActive: true })
      // Newest first. The previous sort led with `displayOrder`, which is not a
      // field on this schema and never has been — so it ordered nothing and only
      // stopped Mongo from using the `{ isActive, createdAt }` index.
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    return toPlainJson(
      (feedbacks as Array<Record<string, any>>).map((feedback) => ({
        ...feedback,
        timeAgo: relativeAge(feedback.createdAt),
      })),
    ) as unknown as StorefrontFeedback[];
  },
  ['storefront-customer-feedback-v1'],
  { tags: [CACHE_TAGS.customerFeedback], revalidate: EDITORIAL_REVALIDATE },
);

export type {
  StorefrontCategory,
  StorefrontFeedback,
  StorefrontProductCard,
} from '@/lib/home/homepage-types';

/* ── Category scope ─────────────────────────────────────────────────────── */

/**
 * A category plus every active descendant — the set a category page lists from.
 *
 * Derived from the cached tree rather than its own query, so a listing request
 * no longer re-reads the whole category collection just to expand one slug.
 */
export const getCachedCategoryScopeIds = unstable_cache(
  async (categoryId: string): Promise<string[]> => {
    const categories = await getCachedCategoryTree();

    const childrenByParent = new Map<string, string[]>();
    for (const category of categories) {
      const parentId = category.parent?._id;
      if (!parentId) continue;
      const siblings = childrenByParent.get(parentId);
      if (siblings) siblings.push(category._id);
      else childrenByParent.set(parentId, [category._id]);
    }

    const root = String(categoryId);
    const scope = [root];
    // `seen` also stops a malformed parent cycle from looping forever.
    const seen = new Set<string>([root]);
    const queue = [root];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of childrenByParent.get(current) || []) {
        if (seen.has(child)) continue;
        seen.add(child);
        scope.push(child);
        queue.push(child);
      }
    }

    return scope;
  },
  ['storefront-category-scope-v1'],
  { tags: [CACHE_TAGS.categories], revalidate: EDITORIAL_REVALIDATE },
);

/** One active category by slug, for a category page's own metadata. */
export const getCachedCategoryBySlug = unstable_cache(
  async (slug: string): Promise<StorefrontCategory | null> => {
    const categories = await getCachedCategoryTree();
    return categories.find((category) => category.slug === slug) || null;
  },
  ['storefront-category-by-slug-v1'],
  { tags: [CACHE_TAGS.categories], revalidate: EDITORIAL_REVALIDATE },
);

/* ── Catalogue listing ──────────────────────────────────────────────────── */

export interface ProductListingPage {
  products: StorefrontProductCard[];
  total: number;
  pages: number;
}

/**
 * The unfiltered first page of `/products`, with its total.
 *
 * That one combination is what every visitor to the listing sees first, so it is
 * worth a cache entry and worth server-rendering; every filtered or paged
 * variant stays a live query, because there are too many of them for a cache to
 * help and none of them is a cold-start critical path.
 */
export const getCachedProductListingPage = unstable_cache(
  async (limit: number): Promise<ProductListingPage> => {
    await connectDB();

    const [products, total] = await Promise.all([
      Product.find({ isActive: true })
        .select(PRODUCT_CARD_FIELDS)
        .populate('category', 'name slug')
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean(),
      Product.countDocuments({ isActive: true }),
    ]);

    return toPlainJson({
      products: products as unknown as StorefrontProductCard[],
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  },
  ['storefront-product-listing-page-v1'],
  { tags: [CACHE_TAGS.products], revalidate: EDITORIAL_REVALIDATE },
);
