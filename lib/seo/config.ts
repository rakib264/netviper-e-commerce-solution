import 'server-only';

import { unstable_cache } from 'next/cache';

import { normalizeCurrency, type CurrencyCode } from '@/lib/currency/config';
import { normalizeLocale, type Locale } from '@/lib/i18n/config';
import {
  BRAND,
  brandSameAs,
  isPlaceholder,
  urlFor,
  type BrandContact,
  type BrandSocialLinks,
} from '@/lib/seo/brand';
import {
  getCachedPublicGeneralSettings,
  PUBLIC_GENERAL_SETTINGS_CACHE_TAG,
} from '@/lib/theme/general-settings-server';

/**
 * The resolved SEO identity for this request.
 *
 * Three layers, lowest priority first:
 *
 *   `lib/seo/brand.ts`  →  environment variables  →  DB `GeneralSettings`
 *
 * The database wins because `/admin/settings` already edits `siteName`,
 * `siteUrl`, `logo1`, `favicon`, `socialLinks`, `contactEmail`, `contactPhone`
 * and `address`. An admin changing the site name in the panel and then seeing
 * the old one in `<head>` would be a bug, not a safety feature — so the panel is
 * authoritative and `brand.ts` supplies what the panel has no field for
 * (title template, keyword seeds, delivery promise, crawl policy).
 *
 * Read through `getCachedPublicGeneralSettings()` rather than querying Mongoose
 * again, and tagged with that reader's own cache tag. An admin save therefore
 * already invalidates this reader, and no new invalidation plumbing exists to
 * forget to call.
 */
export interface SeoConfig {
  name: string;
  legalName: string;
  shortName: string;
  url: string;
  domain: string;
  description: string;
  titleTemplate: string;
  defaultTitle: string;

  locale: Locale;
  ogLocale: string;
  ogAlternateLocales: string[];
  currency: CurrencyCode;
  country: string;
  timezone: string;

  /** Absolute URLs — a relative OG image is silently dropped by most scrapers. */
  logo: string;
  logoWidth: number;
  logoHeight: number;
  ogImage: string;

  social: BrandSocialLinks;
  sameAs: string[];
  contact: BrandContact;

  organizationType: 'OnlineStore' | 'GroceryStore';
  /** True only when there is a real, complete postal address to publish. */
  hasPhysicalLocation: boolean;

  verification: typeof BRAND.verification;

  /** Absolute URL for any app path, bound to the resolved origin. */
  absolute: (path?: string) => string;
}

/**
 * Site names that must never reach `<head>`.
 *
 * A settings document written before a rebrand keeps its old `siteName`
 * forever; without this list, one stale DB row silently resurrects a dead brand
 * across every page title, OG tag and JSON-LD node. Anything matching here is
 * treated as "unset" and falls through to `brand.ts`.
 *
 * Extend this on every rebrand rather than editing the row by hand — the row is
 * not the only place the old value can come from.
 */
export const LEGACY_SITE_NAMES = [
  'Mascari Mart',
  'Muscari Mart',
  'muscari-mart',
  'muscarimart',
  'Muscari Mart - Premium Women’s Sarees',
  'TSR Gallery',
  'TSRGallery',
  'NextEcom',
  'nextecom',
  'myfood',
  'Well Rise',
  'wellrise',
];

const LEGACY_SITE_NAME_SET = new Set(
  LEGACY_SITE_NAMES.map((name) => name.trim().toLowerCase()),
);

/** A stored value that is blank, placeholder, or a known dead brand. */
function usable(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (isPlaceholder(trimmed)) return undefined;
  if (LEGACY_SITE_NAME_SET.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

/** First usable value wins; `undefined` when every layer is empty. */
function pick(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    const value = usable(candidate);
    if (value) return value;
  }
  return undefined;
}

/**
 * Make a possibly-relative asset path absolute against the resolved origin.
 *
 * OG and `ImageObject` URLs must be absolute: a scraper fetching the tag has no
 * page context to resolve `/brand/og-image.png` against, so a relative value
 * yields no preview at all.
 */
function absoluteAsset(value: string | undefined, origin: string, fallback: string): string {
  const candidate = usable(value) || fallback;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return urlFor(candidate, origin);
}

async function buildSeoConfig(): Promise<SeoConfig> {
  // A settings read failing must not take the page's `<head>` down with it —
  // `brand.ts` alone is a complete, correct identity.
  const settings = await getCachedPublicGeneralSettings().catch(() => null);

  const origin = (
    pick(settings?.siteUrl, process.env.NEXT_PUBLIC_SITE_URL, BRAND.url) || BRAND.url
  ).replace(/\/+$/, '');

  const name = pick(settings?.siteName, process.env.NEXT_PUBLIC_SITE_NAME, BRAND.name)!;

  // The description is i18n copy and is resolved by `buildMetadata` per locale;
  // an admin-authored override in the settings row still wins over the key.
  const description =
    pick(settings?.siteDescription, process.env.NEXT_PUBLIC_SITE_DESCRIPTION) || '';

  const social: BrandSocialLinks = {
    ...BRAND.social,
    // Only real values survive `usable`, so an empty admin field cannot blank a
    // link configured in `brand.ts`, and cannot put `''` into `sameAs`.
    ...(usable(settings?.socialLinks?.facebook)
      ? { facebook: settings!.socialLinks!.facebook }
      : {}),
    ...(usable(settings?.socialLinks?.instagram)
      ? { instagram: settings!.socialLinks!.instagram }
      : {}),
    ...(usable(settings?.socialLinks?.tiktok)
      ? { tiktok: settings!.socialLinks!.tiktok }
      : {}),
    ...(usable(settings?.socialLinks?.youtube)
      ? { youtube: settings!.socialLinks!.youtube }
      : {}),
  };

  const address = pick(
    settings?.location?.formattedAddress,
    settings?.location?.address,
    settings?.address,
    BRAND.contact.address,
  );

  const contact: BrandContact = {
    email: pick(settings?.contactEmail, BRAND.contact.email) || BRAND.contact.email,
    phone: pick(settings?.contactPhone, BRAND.contact.phone) || BRAND.contact.phone,
    ...(BRAND.contact.whatsapp ? { whatsapp: BRAND.contact.whatsapp } : {}),
    ...(address ? { address } : {}),
    ...(BRAND.contact.openingHours ? { openingHours: [...BRAND.contact.openingHours] } : {}),
  };

  // A `LocalBusiness` claim needs a real address and real hours. Without both,
  // the store stays an `OnlineStore` however `brand.ts` is configured —
  // inventing a storefront is precisely the failure this guards against.
  const hasPhysicalLocation = Boolean(
    contact.address && contact.openingHours && contact.openingHours.length > 0,
  );

  return {
    name,
    legalName: pick(BRAND.legalName) || name,
    shortName: pick(BRAND.shortName) || name,
    url: origin,
    domain: origin.replace(/^https?:\/\//, ''),
    description,
    titleTemplate: BRAND.titleTemplate,
    defaultTitle: BRAND.defaultTitle,

    locale: normalizeLocale(settings?.language, BRAND.defaultLocale),
    ogLocale: BRAND.ogLocale,
    ogAlternateLocales: [...BRAND.ogAlternateLocales],
    currency: normalizeCurrency(settings?.currency, BRAND.currency),
    country: BRAND.country,
    timezone: pick(settings?.timezone) || BRAND.timezone,

    logo: absoluteAsset(settings?.logo1, origin, BRAND.logo),
    logoWidth: BRAND.logoWidth,
    logoHeight: BRAND.logoHeight,
    ogImage: absoluteAsset(undefined, origin, BRAND.ogImage),

    social,
    sameAs: brandSameAs(social),
    contact,

    organizationType: hasPhysicalLocation ? BRAND.organizationType : 'OnlineStore',
    hasPhysicalLocation,

    verification: BRAND.verification,

    absolute: (path = '/') => urlFor(path, origin),
  };
}

/**
 * Cached SEO identity.
 *
 * `absolute` is a closure, and `unstable_cache` serializes what it stores — so
 * the function would not survive a cache hit. The cache therefore holds only
 * the serializable half and the closure is re-attached on the way out.
 */
const getCachedSeoData = unstable_cache(
  async () => {
    const { absolute, ...data } = await buildSeoConfig();
    return data;
  },
  ['seo-config-v1'],
  {
    tags: [PUBLIC_GENERAL_SETTINGS_CACHE_TAG],
    // Backstop only: an admin save invalidates the tag immediately.
    revalidate: 300,
  },
);

export async function getSeoConfig(): Promise<SeoConfig> {
  const data = await getCachedSeoData();
  return {
    ...data,
    absolute: (path = '/') => urlFor(path, data.url),
  };
}
