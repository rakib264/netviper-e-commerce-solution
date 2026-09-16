import 'server-only';

import { revalidateTag } from 'next/cache';

import { CACHE_TAGS, type CacheTag } from '@/lib/cache/tags';

/**
 * Drop the storefront read caches a mutation invalidates.
 *
 * Call this from every admin write path. It is deliberately fire-and-forget:
 * `revalidateTag` throwing (it does, outside a request scope — e.g. from a queue
 * worker) must never turn a successful save into a 500. A missed invalidation
 * costs one stale read until the tag's `revalidate` window elapses; a thrown
 * error costs the admin their edit.
 */
export function revalidateStorefront(...tags: CacheTag[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag);
    } catch (error) {
      console.error(`[cache] revalidateTag(${tag}) failed:`, error);
    }
  }
}

/**
 * Named helpers, one per admin surface, so a route handler names *what it
 * changed* rather than remembering which tags that touches.
 *
 * The homepage aggregate is invalidated alongside every one of them, because it
 * is assembled from all of these collections at once.
 */
export const revalidateBanners = () =>
  revalidateStorefront(CACHE_TAGS.banners, CACHE_TAGS.homepage);

export const revalidateCategories = () =>
  revalidateStorefront(CACHE_TAGS.categories, CACHE_TAGS.homepage);

/** Products feed the homepage grids, the showcases and every curated band. */
export const revalidateProducts = () =>
  revalidateStorefront(
    CACHE_TAGS.products,
    CACHE_TAGS.curatedSections,
    CACHE_TAGS.productShowcase,
    CACHE_TAGS.comboBundles,
    CACHE_TAGS.homepage,
  );

export const revalidateAdvertisements = () =>
  revalidateStorefront(CACHE_TAGS.advertisements, CACHE_TAGS.homepage);

export const revalidateCuratedSections = () =>
  revalidateStorefront(CACHE_TAGS.curatedSections, CACHE_TAGS.homepage);

export const revalidateProductShowcase = () =>
  revalidateStorefront(CACHE_TAGS.productShowcase, CACHE_TAGS.homepage);

export const revalidateComboBundles = () =>
  revalidateStorefront(CACHE_TAGS.comboBundles, CACHE_TAGS.homepage);

export const revalidateEvents = () =>
  revalidateStorefront(CACHE_TAGS.events, CACHE_TAGS.homepage);

export const revalidateDeals = () =>
  revalidateStorefront(CACHE_TAGS.deals, CACHE_TAGS.homepage);


/** Blogs have their own listing and detail pages, and feed no homepage band. */
export const revalidateBlogs = () => revalidateStorefront(CACHE_TAGS.blogs);

export const revalidateReturnPolicy = () =>
  revalidateStorefront(CACHE_TAGS.returnPolicy);

export const revalidateCustomerFeedback = () =>
  revalidateStorefront(CACHE_TAGS.customerFeedback, CACHE_TAGS.homepage);
