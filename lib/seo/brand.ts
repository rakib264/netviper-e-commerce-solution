/**
 * Brand identity — the single file you edit to rebrand this storefront.
 *
 * This file contains no logic, and every other file in the app reads brand
 * identity through it. Changing the values here plus replacing the images in
 * `public/brand/` rebrands the entire site: `<head>` tags, JSON-LD, robots,
 * sitemap, manifest, generated OG images, the header wordmark, the footer, the
 * transactional emails, and the SMS sender name. Nothing else should need to
 * change, and a brand literal surviving anywhere outside this file is a bug.
 *
 * Deliberately free of runtime imports — no `server-only`, no database, no app
 * modules — so it can be imported from a server component, a client component,
 * an edge route, a queue job or a plain script alike. The two `import type`
 * lines below are erased at compile time; they exist so that dropping a locale
 * or a currency from its registry becomes a type error here rather than a
 * silently wrong `<html lang>` in production.
 *
 * Values marked `TODO_` are placeholders with no real data behind them. They
 * are written to be obviously fake, because a plausible-looking but invented
 * phone number or address is an active ranking liability: search engines cross
 * check an Organization's contact details against other sources, and a
 * mismatch splits the entity. Omitting a field is always better than guessing
 * it — which is why the optional keys below are absent rather than empty
 * strings. Anything still reading `TODO_` should be filled in here, or left to
 * `/admin/settings`, which overrides this file at runtime.
 */

import type { CurrencyCode } from '@/lib/currency/config';
import type { Locale } from '@/lib/i18n/config';

/** A social profile we actually have. Absent keys are omitted from `sameAs`. */
export interface BrandSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  x?: string;
}

export interface BrandContact {
  email: string;
  phone: string;
  whatsapp?: string;
  /** Street address. Only set this when there is a real, visitable address. */
  address?: string;
  /** Schema.org `openingHours` strings, e.g. `Mo-Su 09:00-22:00`. */
  openingHours?: string[];
}

/**
 * The delivery promise, stated once.
 *
 * Both the FAQ copy and the `OfferShippingDetails` schema read these numbers,
 * so the promise a customer reads and the promise Google indexes cannot drift
 * apart. Charges are plain numbers — never a formatted string with a symbol in
 * it — so they format through `lib/currency` like every other amount.
 */
export interface BrandDelivery {
  dhaka: { minDays: number; maxDays: number; charge: number };
  nationwide: { minDays: number; maxDays: number; charge: number };
  /** Order subtotal above which delivery is free. */
  freeThreshold: number;
  /** Time between the order landing and it leaving the warehouse. */
  handlingDays: { min: number; max: number };
}

export const BRAND = {
  /* ── Identity ──────────────────────────────────────────────────────── */

  name: 'Ramen Bhai',
  /**
   * The registered trading entity, used for `Organization.legalName`. Left as a
   * placeholder: this must match company registration exactly, and a guess here
   * is worse than an omission.
   */
  legalName: 'TODO_LEGAL_ENTITY_NAME',
  /** Header wordmark and PWA manifest `short_name` (12 characters or fewer). */
  shortName: 'Ramen Bhai',

  domain: 'ramenbhai.com',
  url: 'https://ramenbhai.com',

  /* ── Locale and market ─────────────────────────────────────────────── */

  defaultLocale: 'en' as Locale,
  supportedLocales: ['en', 'bn'] as Locale[],
  ogLocale: 'en_US',
  ogAlternateLocales: ['bn_BD'],
  currency: 'BDT' as CurrencyCode,
  country: 'BD',
  timezone: 'Asia/Dhaka',
  areaServed: {
    country: 'Bangladesh',
    countryCode: 'BD',
    /** The zone we promise the fastest delivery to. */
    primaryCity: 'Dhaka',
  },

  /* ── Copy ──────────────────────────────────────────────────────────── */

  /**
   * i18n key names, never English strings — the tagline and description are
   * user-facing copy and are resolved per locale at render time.
   */
  taglineKey: 'brand.tagline',
  descriptionKey: 'brand.description',

  titleTemplate: '%s | Ramen Bhai',
  /** Kept under 60 characters so it survives `buildMetadata`'s truncation. */
  defaultTitle: 'Ramen Bhai — Korean Ramen & Groceries in Bangladesh',

  /**
   * Tagline baked into the generated social card.
   *
   * English-only and deliberately not an i18n key: it is rasterised into a PNG
   * at build time, and one image cannot carry three languages. Everything a
   * visitor reads as text still goes through `taglineKey`.
   */
  ogTagline: 'Korean ramen, groceries & daily essentials',

  /* ── Assets ────────────────────────────────────────────────────────── */

  logo: '/brand/logo.png',
  /** 1200×630. Also the fallback for any page that supplies no image. */
  ogImage: '/brand/og-image.png',
  favicon: '/favicon.ico',
  appleIcon: '/brand/apple-icon.png',
  maskIcon: '/brand/mask-icon.svg',
  /** Dimensions of `logo`, required by `ImageObject` in the Organization node. */
  logoWidth: 512,
  logoHeight: 512,

  /**
   * Palette for the generated brand artwork — the icons and OG images produced
   * by `yarn brand:assets` and by the `next/og` routes in `app/`.
   *
   * Separate from the storefront palette in `/admin/settings`, which an admin
   * may retheme seasonally. A favicon that changed with the theme would be a
   * worse favicon: recognition depends on it staying put.
   */
  art: {
    background: '#D7263D',
    foreground: '#FFF6E9',
    accent: '#1A1A1A',
  },

  /* ── Presence ──────────────────────────────────────────────────────── */

  /**
   * Only profiles that exist belong here. An empty string in `sameAs` is worse
   * than a missing key — it tells a crawler to resolve the site's own origin as
   * a social profile.
   */
  social: {} as BrandSocialLinks,

  contact: {
    email: 'TODO_SUPPORT_EMAIL',
    phone: 'TODO_SUPPORT_PHONE',
    // `whatsapp`, `address` and `openingHours` are deliberately absent: this is
    // an online-only store with no visitable address, and inventing an address
    // to fill a `LocalBusiness` node is exactly the mistake this file exists to
    // prevent.
  } as BrandContact,

  /**
   * `OnlineStore` because there is no physical shop or pickup point. Switching
   * this to `GroceryStore` additionally requires a real `contact.address` and
   * `contact.openingHours`; `storeSchema()` will refuse to claim a
   * `LocalBusiness` without them.
   */
  organizationType: 'OnlineStore' as 'OnlineStore' | 'GroceryStore',

  /** Founding year, used for `Organization.foundingDate`. */
  foundingDate: '2024',

  /* ── Search vocabulary ─────────────────────────────────────────────── */

  /**
   * The canonical category vocabulary. Used for default page keywords, FAQ
   * seeding and the `about` entities in schema, so the terms the site ranks for
   * and the terms an answer engine associates with it are the same list.
   */
  keywordSeeds: [
    'Korean ramen',
    'instant noodles',
    'Samyang',
    'Buldak',
    'Shin Ramyun',
    'Nongshim',
    'Ottogi',
    'Paldo',
    'Bibigo',
    'mandu',
    'dumplings',
    'tteokbokki',
    'gochujang',
    'sushi ingredients',
    'nori',
    'sushi rice',
    'wasabi',
    'soy sauce',
    'Tang',
    'Rooh Afza',
    'coffee',
    'tea',
    'popcorn',
    'snacks',
    'groceries',
    'daily essentials',
    'online grocery Bangladesh',
    'online grocery Dhaka',
  ] as string[],

  /**
   * Product-brand entities worth disambiguating for answer engines. A Wikipedia
   * or Wikidata URL attached to a `Brand` node is the cheapest entity signal
   * available; brands without one still help as `about` mentions.
   */
  brandEntities: [
    { name: 'Samyang Foods', sameAs: 'https://en.wikipedia.org/wiki/Samyang_Foods' },
    { name: 'Nongshim', sameAs: 'https://en.wikipedia.org/wiki/Nongshim' },
    { name: 'Ottogi', sameAs: 'https://en.wikipedia.org/wiki/Ottogi' },
    { name: 'Paldo', sameAs: 'https://en.wikipedia.org/wiki/Paldo_(company)' },
    { name: 'Bibigo', sameAs: 'https://en.wikipedia.org/wiki/CJ_CheilJedang' },
    { name: 'Tang', sameAs: 'https://en.wikipedia.org/wiki/Tang_(drink_mix)' },
    { name: 'Rooh Afza', sameAs: 'https://en.wikipedia.org/wiki/Rooh_Afza' },
  ] as Array<{ name: string; sameAs?: string }>,

  /* ── Commerce ──────────────────────────────────────────────────────── */

  /** Schema.org `paymentAccepted`. Mirrors what checkout actually offers. */
  paymentAccepted: ['Cash on Delivery', 'Credit Card', 'Debit Card', 'SSLCommerz'],

  /**
   * Coarse price band for `priceRange`. Schema.org wants a human-readable hint,
   * not a computed figure, so this stays a symbol-free descriptor rather than
   * quoting amounts that would go stale.
   */
  priceRange: '৳৳',

  delivery: {
    dhaka: { minDays: 1, maxDays: 2, charge: 60 },
    nationwide: { minDays: 3, maxDays: 5, charge: 120 },
    freeThreshold: 2000,
    handlingDays: { min: 0, max: 1 },
  } as BrandDelivery,

  /**
   * Halal status of the imported Korean range, as confirmed by the business on
   * 2026-09-16. This drives FAQ copy and product answer blocks, so it is stated
   * once here rather than repeated across templates. Do not widen this claim to
   * cover products outside the Korean import range without confirmation.
   */
  halalCertifiedImports: true,

  /* ── Search Console / Webmaster verification ───────────────────────── */

  /** All optional. An absent key emits no meta tag at all. */
  verification: {} as {
    google?: string;
    bing?: string;
    yandex?: string;
    pinterest?: string;
    facebook?: string;
  },

  /* ── Crawl policy ──────────────────────────────────────────────────── */

  sitemap: {
    /**
     * Never indexable: session-bound surfaces, the admin panel, and the legacy
     * dev scaffolding routes that were never meant to be public.
     */
    excludePaths: [
      '/admin',
      '/api',
      '/auth',
      '/cart',
      '/checkout',
      '/orders',
      '/profile',
      '/returns',
      '/wishlist',
    ],
    priorities: {
      home: 1.0,
      listing: 0.9,
      product: 0.8,
      category: 0.8,
      rail: 0.7,
      blog: 0.6,
      event: 0.6,
      policy: 0.4,
    },
    changefreq: {
      home: 'daily',
      listing: 'daily',
      product: 'weekly',
      category: 'weekly',
      rail: 'daily',
      blog: 'monthly',
      event: 'daily',
      policy: 'yearly',
    },
  },

  /**
   * AI crawlers allowed to read the site. Training-corpus bots
   * (`GPTBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`) are included by
   * an explicit business decision: blocking them also removes the store from
   * those answer surfaces, which is the opposite of what the AEO work is for.
   */
  aiCrawlers: [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'Claude-Web',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Bingbot',
    'Amazonbot',
  ],
} as const;

export type Brand = typeof BRAND;

/**
 * Absolute URL for an app path.
 *
 * Every canonical, `sameAs`, sitemap entry and JSON-LD `@id` goes through here
 * so no file concatenates a base URL by hand — which is how this repo ended up
 * with `muscarimart.com` and `www.muscarimart.com` disagreeing across pages.
 * Trailing slashes are stripped to match `trailingSlash: false` in
 * `next.config.js`, so a canonical can never disagree with the URL that
 * actually serves it.
 */
export function urlFor(path = '/', base: string = BRAND.url): string {
  const origin = base.replace(/\/+$/, '');
  if (!path || path === '/') return origin;

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  // Only the path is trimmed; a query string keeps whatever shape it arrived in.
  const [pathname, query] = withLeadingSlash.split('?');
  const trimmed = pathname.replace(/\/+$/, '') || '';

  return `${origin}${trimmed}${query ? `?${query}` : ''}`;
}

/** `sameAs` for the Organization node: real profiles only, in a stable order. */
export function brandSameAs(social: BrandSocialLinks = BRAND.social): string[] {
  return (['facebook', 'instagram', 'tiktok', 'youtube', 'x'] as const)
    .map((key) => social[key])
    .filter((value): value is string => Boolean(value && value.trim()));
}

/** True for a value that is a placeholder rather than real data. */
export function isPlaceholder(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('TODO_');
}
