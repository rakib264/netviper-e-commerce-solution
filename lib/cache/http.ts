/**
 * `Cache-Control` headers for public read endpoints.
 *
 * These govern the *shared* CDN cache and the browser, and are a separate layer
 * from the tag-invalidated `unstable_cache` entries the handlers read through.
 * `s-maxage` lets the edge answer without touching the function at all;
 * `stale-while-revalidate` means the first request after that window still gets
 * an instant answer while the refresh happens behind it.
 *
 * Deliberately no `no-store` on public reads. Every one of these endpoints used
 * to be fetched with `cache: 'no-store'` from the client, which forbade every
 * cache in the path from helping — the browser could not even reuse a response
 * it had received seconds earlier on the same page.
 */

/** Admin-authored content: safe to hold, and an admin write revalidates the tag. */
export const PUBLIC_CONTENT_CACHE_HEADER =
  'public, s-maxage=300, stale-while-revalidate=600';

/** Content whose visibility turns on a clock (deals, events, scheduled offers). */
export const SCHEDULED_CONTENT_CACHE_HEADER =
  'public, s-maxage=60, stale-while-revalidate=300';

/** Anything derived from stock or price, where a stale answer misleads. */
export const VOLATILE_CONTENT_CACHE_HEADER =
  'public, s-maxage=30, stale-while-revalidate=120';

/** Per-visitor responses. Never shared, but the browser may reuse briefly. */
export const PRIVATE_CACHE_HEADER = 'private, no-cache';
