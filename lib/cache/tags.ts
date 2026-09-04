/**
 * Cache tags for the storefront's server-side read caches.
 *
 * Every cached read (`unstable_cache`) declares the tags it depends on, and every
 * admin write calls the matching `revalidate*` helper below. That is the whole
 * contract: a cached read is only ever stale for as long as it takes an admin
 * mutation to finish, and no read has to guess a TTL short enough to hide an
 * edit.
 *
 * Kept free of `server-only` and of any model import so a route handler can
 * import just the tag names without pulling Mongoose into its bundle graph.
 */

export const CACHE_TAGS = {
  /** Hero carousel slides. */
  banners: 'storefront:banners',
  /** Category tree (names, images, nesting). */
  categories: 'storefront:categories',
  /** Anything derived from the product catalogue. */
  products: 'storefront:products',
  /** Advertisement bands, both families. */
  advertisements: 'storefront:advertisements',
  /** Admin-configured curated product bands. */
  curatedSections: 'storefront:curated-sections',
  /** Product-showcase sections. */
  productShowcase: 'storefront:product-showcase',
  /** Combo/bundle offers. */
  comboBundles: 'storefront:combo-bundles',
  /** Scheduled events shown on the landing page. */
  events: 'storefront:events',
  /** Running deals. */
  deals: 'storefront:deals',
  /** Customer feedback used by the social-proof band. */
  customerFeedback: 'storefront:customer-feedback',
  /** Admin-authored returns policy copy shown to customers. */
  returnPolicy: 'storefront:return-policy',
  /** The aggregate homepage payload — invalidated by any of the above. */
  homepage: 'storefront:homepage',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Tags the aggregate homepage read depends on.
 *
 * The homepage payload is one cache entry built from many collections, so it
 * carries every contributing tag rather than only its own: invalidating
 * `products` has to drop it too, or an edited product would keep showing its old
 * price in the homepage grid while `/products` showed the new one.
 */
export const HOMEPAGE_DEPENDENCY_TAGS: CacheTag[] = [
  CACHE_TAGS.homepage,
  CACHE_TAGS.banners,
  CACHE_TAGS.categories,
  CACHE_TAGS.products,
  CACHE_TAGS.advertisements,
  CACHE_TAGS.curatedSections,
  CACHE_TAGS.productShowcase,
  CACHE_TAGS.comboBundles,
  CACHE_TAGS.events,
  CACHE_TAGS.deals,
  CACHE_TAGS.customerFeedback,
];
