import type { AdvertisementDTO } from '@/lib/advertisements/types';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import type { ResolvedCuratedSection } from '@/lib/curated-sections/client-types';
import type { ActiveDealSummary } from '@/lib/deals/showcase';
import type { HeroSlide } from '@/lib/hero-carousel/types';

/**
 * The homepage payload, described once for both sides of the boundary.
 *
 * Deliberately free of `server-only` and of any model import: the server data
 * layer produces this shape and client sections consume it, so the type has to
 * be importable from either. The producing code lives in
 * `lib/home/homepage-data.ts`.
 */

export interface StorefrontCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  parent?: { _id: string; name: string; slug: string } | null;
}

export interface StorefrontProductCard {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  images?: string[];
  averageRating?: number;
  totalReviews?: number;
  quantity?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isLimitedEdition?: boolean;
  shortDescription?: string;
  productSize?: string[];
  variants?: Array<Record<string, unknown>>;
  category?: { _id?: string; name: string; slug: string } | null;
}

export interface StorefrontFeedback {
  _id: string;
  platform: string;
  platformName: string;
  customer: {
    name: string;
    avatar: string;
    location: string;
    verified: boolean;
  };
  message: string;
  rating: number;
  productImage?: string;
  timeAgo?: string;
}

/**
 * `null` means "this section was not asked for", which is not the same as an
 * empty array. An enabled section that resolves to nothing must render its empty
 * state; a section rendered without server data has to fetch for itself. Only
 * `null` distinguishes the two.
 */
export interface HomepageData {
  heroSlides: HeroSlide[] | null;
  categories: StorefrontCategory[] | null;
  newestProducts: StorefrontProductCard[] | null;
  featuredProducts: StorefrontProductCard[] | null;
  advertisements: Record<'horizontal' | 'vertical', AdvertisementDTO[]> | null;
  curatedSections: ResolvedCuratedSection[] | null;
  /** Loosely typed: the showcase DTO is assembled from admin-shaped documents. */
  showcaseSections: unknown[] | null;
  comboBundles: ResolvedComboBundle[] | null;
  landingEvents: unknown[] | null;
  activeDeals: ActiveDealSummary[] | null;
  customerFeedback: StorefrontFeedback[] | null;
}

/** Every slice absent — what a non-SSR mount starts from. */
export const EMPTY_HOMEPAGE_DATA: HomepageData = {
  heroSlides: null,
  categories: null,
  newestProducts: null,
  featuredProducts: null,
  advertisements: null,
  curatedSections: null,
  showcaseSections: null,
  comboBundles: null,
  landingEvents: null,
  activeDeals: null,
  customerFeedback: null,
};
