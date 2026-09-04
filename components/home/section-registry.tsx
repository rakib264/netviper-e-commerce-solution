'use client';

import ActiveDeals from '@/components/home/ActiveDeals';
import AllProductsListing from '@/components/home/AllProductsListing';
import ComboBundlesSection from '@/components/home/ComboBundlesSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import HeroCarousel from '@/components/home/HeroCarousel';
import HorizontalAdvertisements from '@/components/home/HorizontalAdvertisements';
import LandingEvents from '@/components/home/LandingEvents';
import ModernCategorySection from '@/components/home/ModernCategorySection';
import Newsletter from '@/components/home/Newsletter';
import SocialProof from '@/components/home/SocialProof';
import VerticalAdvertisements from '@/components/home/VerticalAdvertisements';
import CuratedProductSection from '@/components/home/curated/CuratedProductSection';
import type { HomepageSectionProps } from '@/components/home/section-props';
import ShowcaseSectionBlock, {
  type ResolvedShowcaseSection,
} from '@/components/product-showcase/ProductShowcaseRenderer';
import type { ResolvedCuratedSection } from '@/lib/curated-sections/client-types';
import type { HomepageData } from '@/lib/home/homepage-types';
import {
  parseCuratedSlotKey,
  parseShowcaseSlotKey,
  type HomepageSectionKey,
  type StaticHomepageSectionKey,
} from '@/lib/landing/homepage-sections';

/**
 * Data a section needs that does not come from its own config.
 *
 * One field: the whole server-resolved homepage payload. Each renderer picks its
 * own slice out of it and hands it to the component as an `initial*` prop, so a
 * section paints real content on the very first render. A `null` slice means the
 * page was rendered without server data, and the component falls back to
 * fetching for itself.
 */
export interface SectionRenderContext {
  data: HomepageData;
}

export type SectionRenderer = (
  props: HomepageSectionProps,
  context: SectionRenderContext,
  /** Position in the page order — the band below the hero pads differently. */
  index: number,
) => React.ReactNode;

export const HOMEPAGE_SECTION_RENDERERS: Record<
  StaticHomepageSectionKey,
  SectionRenderer
> = {
  heroCarousel: (_props, { data }) => (
    <HeroCarousel initialSlides={data.heroSlides} />
  ),

  categories: (props, { data }) => (
    <ModernCategorySection {...props} initialCategories={data.categories} />
  ),

  productListing: (props, { data }) => (
    <AllProductsListing {...props} initialProducts={data.newestProducts} />
  ),

  horizontalAdvertisements: (props, { data }) => (
    <HorizontalAdvertisements
      {...props}
      initialAds={data.advertisements?.horizontal ?? null}
    />
  ),

  landingEvents: (props, { data }) => (
    <LandingEvents {...props} initialEvents={data.landingEvents} />
  ),

  comboBundles: (props, { data }) => (
    <ComboBundlesSection {...props} initialCombos={data.comboBundles} />
  ),

  activeDeals: (props, { data }, index) => (
    <ActiveDeals
      {...props}
      initialDeals={data.activeDeals}
      // Shipped directly below the hero, which already carries its own
      // generous bottom padding.
      rhythm={index === 1 ? 'after-hero' : 'default'}
    />
  ),

  featuredProducts: (props, { data }) => (
    <FeaturedProducts {...props} initialProducts={data.featuredProducts} />
  ),

  verticalAdvertisements: (props, { data }) => (
    <VerticalAdvertisements
      {...props}
      initialAds={data.advertisements?.vertical ?? null}
    />
  ),

  socialProof: (props, { data }) => (
    <SocialProof {...props} initialFeedback={data.customerFeedback} />
  ),

  newsletter: (props) => <Newsletter {...props} />,
};

/**
 * Resolve the renderer for a slot key.
 *
 * Product-showcase and curated slots are dynamic — one per section document — so
 * they cannot live in the static map. A slot whose section has been deleted, or
 * whose section is switched off, resolves to a renderer that returns `null`,
 * which is how the homepage stays correct in the window before the server sync
 * removes the stale slot document.
 */
function showcaseSlotRenderer(showcaseId: string): SectionRenderer {
  return function ShowcaseSlot(_props, { data }) {
    const sections = (data.showcaseSections || []) as ResolvedShowcaseSection[];
    const section = sections.find((item) => item._id === showcaseId);
    return section ? <ShowcaseSectionBlock section={section} /> : null;
  };
}

function curatedSlotRenderer(curatedId: string): SectionRenderer {
  return function CuratedSlot(_props, { data }) {
    const sections = (data.curatedSections || []) as ResolvedCuratedSection[];
    const section = sections.find((item) => item._id === curatedId);
    return section ? <CuratedProductSection section={section} /> : null;
  };
}

export function getSectionRenderer(
  key: HomepageSectionKey,
): SectionRenderer | undefined {
  const showcaseId = parseShowcaseSlotKey(key);
  if (showcaseId) return showcaseSlotRenderer(showcaseId);

  const curatedId = parseCuratedSlotKey(key);
  if (curatedId) return curatedSlotRenderer(curatedId);

  return HOMEPAGE_SECTION_RENDERERS[key as StaticHomepageSectionKey];
}
