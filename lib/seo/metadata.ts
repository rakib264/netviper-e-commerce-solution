import 'server-only';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import {
  LOCALE_COOKIE_NAME,
  normalizeAllowedLocales,
  normalizeLocale,
  resolveActiveLocale,
  type Locale,
} from '@/lib/i18n/config';
import { createTranslator, type TranslationValues } from '@/lib/i18n/dictionary';
import { BRAND } from '@/lib/seo/brand';
import { getSeoConfig, type SeoConfig } from '@/lib/seo/config';
import { getCachedLocalizationSettings } from '@/lib/theme/general-settings-server';

/**
 * The single `Metadata` factory. Every route in the app goes through here.
 *
 * The guardrails below live in the factory rather than at the call sites
 * deliberately: a rule that each page has to remember is a rule that a page
 * added six months from now will forget. Truncation, the OG image fallback, the
 * absolute-URL requirement and the private-route `noindex` are therefore
 * properties of the factory, not of the caller.
 */

/** Google renders roughly this much of a title before truncating it. */
const TITLE_MAX = 60;
/** …and roughly this much of a description. */
const DESCRIPTION_MAX = 155;

/**
 * Routes that must never be indexed.
 *
 * Session-bound surfaces: their content is either per-visitor or meaningless to
 * a crawler, and an indexed `/checkout` is a support ticket waiting to happen.
 * Matched by prefix, so `/orders/abc123` is covered by `/orders`.
 */
const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/auth',
  '/cart',
  '/checkout',
  '/orders',
  '/profile',
  '/returns',
  '/wishlist',
];

export type OgImageInput =
  | string
  | { url: string; width?: number; height?: number; alt?: string };

export interface BuildMetadataInput {
  /** i18n key for the title. Preferred over `title` for authored copy. */
  titleKey?: string;
  /** Literal title. Only for DB-authored content — product and category names. */
  title?: string;
  /** Values interpolated into `titleKey`. */
  titleValues?: TranslationValues;

  descriptionKey?: string;
  description?: string;
  descriptionValues?: TranslationValues;

  /** App path, e.g. `/products/buldak-2x`. The canonical is derived from it. */
  path: string;

  images?: OgImageInput[];
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  keywords?: string[];

  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];

  /** Overrides the visitor's resolved locale. Rarely needed. */
  locale?: Locale;

  /**
   * Emit the title verbatim instead of running it through the brand template.
   * Used by the root layout, whose title already *is* the brand.
   */
  absoluteTitle?: boolean;
}

/**
 * Cut to `max` characters on a word boundary, with an ellipsis.
 *
 * DB-authored product copy is written for a product page, not for a SERP
 * snippet, so it routinely runs long. Cutting mid-word looks broken in results;
 * cutting at a space and adding an ellipsis reads as intentional. Backing up
 * more than 25% of the budget to find a space is worse than a hard cut, so a
 * single long token falls back to one.
 */
export function truncateAtWord(value: string, max: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;

  // Leave room for the ellipsis so the result is never longer than `max`.
  const budget = max - 1;
  const slice = text.slice(0, budget);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > budget * 0.75 ? slice.slice(0, lastSpace) : slice;

  return `${cut.replace(/[\s,.;:!?-]+$/, '')}…`;
}

function isPrivatePath(path: string): boolean {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/';
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * The locale this request should render in.
 *
 * Resolved exactly the way `app/layout.tsx` resolves it — visitor cookie
 * checked against the admin's allow-list — so a page's `<title>` cannot end up
 * in a different language from its body.
 */
export async function resolveRequestLocale(override?: Locale): Promise<Locale> {
  if (override) return override;

  try {
    const [settings, cookieStore] = await Promise.all([
      getCachedLocalizationSettings().catch(() => null),
      cookies(),
    ]);

    const defaultLocale = normalizeLocale(settings?.language, BRAND.defaultLocale);
    return resolveActiveLocale({
      requested: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
      defaultLocale,
      allowedLocales: normalizeAllowedLocales(settings?.allowedLanguages, defaultLocale),
    });
  } catch {
    // `cookies()` throws outside a request scope (a build-time metadata pass,
    // for one). The default locale is a correct answer there, not a failure.
    return BRAND.defaultLocale;
  }
}

/** Normalize an image input to an absolute-URL OG image entry. */
function toOgImage(image: OgImageInput, seo: SeoConfig) {
  const raw = typeof image === 'string' ? { url: image } : image;
  const url = /^https?:\/\//i.test(raw.url) ? raw.url : seo.absolute(raw.url);

  return {
    url,
    width: raw.width ?? 1200,
    height: raw.height ?? 630,
    alt: raw.alt || seo.name,
  };
}

export async function buildMetadata(input: BuildMetadataInput): Promise<Metadata> {
  const [seo, locale] = await Promise.all([
    getSeoConfig(),
    resolveRequestLocale(input.locale),
  ]);
  const { t } = createTranslator(locale);

  /* ── Title ──────────────────────────────────────────────────────────── */

  const rawTitle =
    input.title?.trim() ||
    (input.titleKey ? t(input.titleKey, input.titleValues) : '') ||
    seo.defaultTitle;

  // The brand suffix is part of what Google renders, so it comes out of the
  // 60-character budget rather than being added on top of it.
  const suffix = seo.titleTemplate.replace('%s', '');
  const alreadyBranded = rawTitle.toLowerCase().includes(seo.name.toLowerCase());
  const shouldTemplate = !input.absoluteTitle && !alreadyBranded;

  const title = shouldTemplate
    ? seo.titleTemplate.replace(
        '%s',
        truncateAtWord(rawTitle, Math.max(TITLE_MAX - suffix.length, 20)),
      )
    : truncateAtWord(rawTitle, TITLE_MAX);

  /* ── Description ────────────────────────────────────────────────────── */

  const rawDescription =
    input.description?.trim() ||
    (input.descriptionKey ? t(input.descriptionKey, input.descriptionValues) : '') ||
    seo.description ||
    t(BRAND.descriptionKey);

  const description = truncateAtWord(rawDescription, DESCRIPTION_MAX);

  /* ── URLs and images ────────────────────────────────────────────────── */

  const canonical = seo.absolute(input.path);
  const images = (input.images?.length ? input.images : [seo.ogImage]).map((image) =>
    toOgImage(image, seo),
  );

  const noindex = input.noindex ?? isPrivatePath(input.path);

  return {
    metadataBase: new URL(seo.url),
    title: { absolute: title },
    description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    applicationName: seo.name,
    ...(input.authors?.length
      ? { authors: input.authors.map((name) => ({ name })) }
      : {}),

    alternates: {
      canonical,
      // No `languages` key on purpose. Locale is cookie-based with no
      // per-locale URL, so there is no distinct URL for a `hreflang` to point
      // at. The previous root layout advertised `/en-gb` and `/en-us`, which
      // are 404s — worse than emitting nothing at all. Ship locale-prefixed
      // routes first, then add reciprocal hreflang here.
    },

    openGraph: {
      type: input.type === 'product' ? 'website' : input.type || 'website',
      title,
      description,
      url: canonical,
      siteName: seo.name,
      locale: seo.ogLocale,
      alternateLocale: seo.ogAlternateLocales,
      images,
      ...(input.type === 'article'
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime,
            authors: input.authors,
          }
        : {}),
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((image) => image.url),
    },

    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },

    icons: {
      icon: [
        { url: BRAND.favicon, sizes: '48x48', type: 'image/x-icon' },
        { url: '/icon', type: 'image/png', sizes: '512x512' },
      ],
      apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    },

    ...(Object.keys(seo.verification).length ? { verification: seo.verification } : {}),

    appleWebApp: {
      capable: true,
      title: seo.shortName,
      statusBarStyle: 'default',
    },

    other: {
      'meta-country': seo.country,
    },
  };
}
