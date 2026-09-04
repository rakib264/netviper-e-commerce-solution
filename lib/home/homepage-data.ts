import 'server-only';

import {
  EMPTY_HOMEPAGE_DATA,
  type HomepageData,
} from '@/lib/home/homepage-types';
import {
  getCachedActiveDeals,
  getCachedAdvertisements,
  getCachedComboBundles,
  getCachedCuratedSections,
  getCachedCustomerFeedback,
  getCachedFeaturedProducts,
  getCachedHeroSlides,
  getCachedLandingEvents,
  getCachedNewestProducts,
  getCachedRootCategories,
  getCachedShowcaseSections,
} from '@/lib/home/storefront-content';
import {
  isCuratedSlotKey,
  isShowcaseSlotKey,
  settingsBoolean,
  settingsNumber,
  type HomepageSectionConfig,
  type HomepageSectionKey,
} from '@/lib/landing/homepage-sections';

export { EMPTY_HOMEPAGE_DATA };
export type { HomepageData };

/** Hero slides are capped in the admin UI; the storefront never needs more. */
const HERO_SLIDE_LIMIT = 8;

/**
 * Never let one unavailable collection blank the whole page.
 *
 * Each reader resolves independently, so a failing deals engine costs the deals
 * band and nothing else — products, categories and the hero still render.
 */
async function safely<T>(
  read: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[homepage] ${label} read failed:`, error);
    return fallback;
  }
}

/**
 * Resolve the homepage's data for a given slot configuration.
 *
 * Two properties matter here:
 *
 *   1. **Nothing sequential.** Every reader is dispatched together and awaited
 *      once, so the page costs a single round of parallel queries against one
 *      pooled connection. What this replaces was a fetch waterfall: the browser
 *      had to download and hydrate the bundle before issuing fourteen
 *      `no-store` requests, each of which re-entered `connectDB()` and re-ran
 *      its query with no cache in front of it.
 *
 *   2. **Nothing unused.** A section the admin switched off is never queried.
 *      Disabling the events band takes its query off the critical path rather
 *      than merely hiding its output.
 */
export async function getHomepageData(
  sections: HomepageSectionConfig[],
): Promise<HomepageData> {
  const enabled = new Map<HomepageSectionKey, HomepageSectionConfig>();
  for (const section of sections) {
    if (section.isEnabled) enabled.set(section.key, section);
  }

  const has = (key: HomepageSectionKey) => enabled.has(key);
  const settingsFor = (key: HomepageSectionKey) => enabled.get(key)?.settings;

  const wantsShowcase = sections.some(
    (section) => section.isEnabled && isShowcaseSlotKey(section.key),
  );
  const wantsCurated = sections.some(
    (section) => section.isEnabled && isCuratedSlotKey(section.key),
  );

  const comboSettings = settingsFor('comboBundles');

  const [
    heroSlides,
    categories,
    newestProducts,
    featuredProducts,
    advertisements,
    curatedSections,
    showcaseSections,
    comboBundles,
    landingEvents,
    activeDeals,
    customerFeedback,
  ] = await Promise.all([
    has('heroCarousel')
      ? safely(() => getCachedHeroSlides(HERO_SLIDE_LIMIT), [], 'heroSlides')
      : null,

    has('categories')
      ? safely(
          () =>
            getCachedRootCategories(
              settingsNumber(settingsFor('categories'), 'limit', 6),
            ),
          [],
          'categories',
        )
      : null,

    has('productListing')
      ? safely(
          () =>
            getCachedNewestProducts(
              settingsNumber(settingsFor('productListing'), 'limit', 8),
            ),
          [],
          'newestProducts',
        )
      : null,

    has('featuredProducts')
      ? safely(
          () =>
            getCachedFeaturedProducts(
              settingsNumber(settingsFor('featuredProducts'), 'limit', 8),
            ),
          [],
          'featuredProducts',
        )
      : null,

    has('horizontalAdvertisements') || has('verticalAdvertisements')
      ? safely(
          () => getCachedAdvertisements(),
          { horizontal: [], vertical: [] },
          'advertisements',
        )
      : null,

    wantsCurated
      ? safely(() => getCachedCuratedSections(), [], 'curatedSections')
      : null,

    wantsShowcase
      ? safely(() => getCachedShowcaseSections(), [], 'showcaseSections')
      : null,

    has('comboBundles')
      ? safely(
          () =>
            getCachedComboBundles(
              settingsNumber(comboSettings, 'limit', 8),
              settingsBoolean(comboSettings, 'featuredOnly', false),
            ),
          [],
          'comboBundles',
        )
      : null,

    has('landingEvents')
      ? safely(
          () =>
            getCachedLandingEvents(
              settingsNumber(settingsFor('landingEvents'), 'limit', 4),
            ),
          [],
          'landingEvents',
        )
      : null,

    has('activeDeals')
      ? safely(() => getCachedActiveDeals(), [], 'activeDeals')
      : null,

    has('socialProof')
      ? safely(
          () =>
            // The band filters by rating client-side, so it needs a little more
            // than it displays.
            getCachedCustomerFeedback(
              Math.max(settingsNumber(settingsFor('socialProof'), 'limit', 3), 8),
            ),
          [],
          'customerFeedback',
        )
      : null,
  ]);

  return {
    heroSlides,
    categories,
    newestProducts,
    featuredProducts,
    advertisements,
    curatedSections,
    showcaseSections,
    comboBundles,
    landingEvents,
    activeDeals,
    customerFeedback,
  };
}
