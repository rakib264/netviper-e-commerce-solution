/**
 * Locale registry for the storefront.
 *
 * The set of supported locales is deliberately small and closed: every locale
 * listed here must have a matching `locales/<code>.json` dictionary, and every
 * layer that persists a language (Mongoose enum, admin API, admin UI) derives
 * its options from this file rather than repeating the list.
 */

export const SUPPORTED_LOCALES = ['en', 'bn', 'de'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export interface LocaleMeta {
  code: Locale;
  /** English name, used in admin copy. */
  label: string;
  /** Endonym, shown next to the English label so the choice is unambiguous. */
  nativeLabel: string;
  /** BCP-47 tag for `Intl` formatters and the `<html lang>` attribute. */
  intlLocale: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALE_REGISTRY: Record<Locale, LocaleMeta> = {
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    intlLocale: 'en-GB',
    dir: 'ltr',
  },
  bn: {
    code: 'bn',
    label: 'Bangla',
    nativeLabel: 'বাংলা',
    intlLocale: 'bn-BD',
    dir: 'ltr',
  },
  de: {
    code: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    intlLocale: 'de-DE',
    dir: 'ltr',
  },
};

export const LOCALE_LIST: LocaleMeta[] = SUPPORTED_LOCALES.map(
  (code) => LOCALE_REGISTRY[code],
);

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Coerce anything persisted or posted into a supported locale. Accepts region
 * tags (`de-DE`, `en_US`) so a value copied out of a browser header still lands
 * on the right dictionary instead of silently falling back to English.
 */
export function normalizeLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (isSupportedLocale(value)) return value;
  if (typeof value === 'string') {
    const base = value.trim().toLowerCase().replace('_', '-').split('-')[0];
    if (isSupportedLocale(base)) return base;
  }
  return fallback;
}

export function getLocaleMeta(value: unknown): LocaleMeta {
  return LOCALE_REGISTRY[normalizeLocale(value)];
}

/**
 * Cookie holding the visitor's own language choice.
 *
 * A per-visitor choice cannot live in the DB settings singleton, and it has to
 * be readable on the server so the first HTML render is already in the right
 * language — which rules out `localStorage` as the source of truth. The cookie
 * is the source of truth; `localStorage` mirrors it only so the client can
 * recover if the cookie is dropped.
 */
export const LOCALE_COOKIE_NAME = 'site_locale';
export const LOCALE_STORAGE_KEY = 'site-locale';
/** One year — a language preference should outlive a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Locales offered to visitors when the admin has configured nothing.
 *
 * Narrower than `SUPPORTED_LOCALES` on purpose. The store serves Bangladesh, so
 * German is not one of the languages a visitor should be able to switch into —
 * but `de` stays *supported*, with its dictionary intact, because
 * `tests/localization` enforces an identical key tree across all three files
 * and that parity check is what stops a translation silently going missing.
 * Dropping the locale would drop the check with it.
 */
export const DEFAULT_ALLOWED_LOCALES: Locale[] = ['en', 'bn'];

/**
 * Coerce a stored/posted "allowed languages" list onto the supported set.
 *
 * Order always follows `SUPPORTED_LOCALES` so the switcher cannot be reordered
 * by the shape of the saved array, duplicates collapse, and `mustInclude` (the
 * default language) is force-added — an allow-list that excludes the site's own
 * default would leave visitors on a language they are not allowed to pick.
 */
export function normalizeAllowedLocales(
  value: unknown,
  mustInclude?: Locale,
): Locale[] {
  const requested = new Set<Locale>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isSupportedLocale(entry)) requested.add(entry);
    }
  }

  // Emptiness is decided *before* `mustInclude` is folded in. Otherwise a
  // settings document saved before this field existed — or one holding only
  // junk — would collapse to the single default language and leave the
  // storefront with nothing to switch between.
  if (requested.size === 0) return [...DEFAULT_ALLOWED_LOCALES];

  if (mustInclude) requested.add(mustInclude);

  return SUPPORTED_LOCALES.filter((locale) => requested.has(locale));
}

/**
 * Resolve what the visitor should actually see: their own choice when it is
 * still allowed, otherwise the site default. Used identically on the server
 * (from the cookie) and on the client, so the two cannot disagree.
 */
export function resolveActiveLocale(options: {
  requested?: unknown;
  defaultLocale?: unknown;
  allowedLocales?: unknown;
}): Locale {
  const defaultLocale = normalizeLocale(options.defaultLocale, DEFAULT_LOCALE);
  const allowed = normalizeAllowedLocales(options.allowedLocales, defaultLocale);

  if (isSupportedLocale(options.requested) && allowed.includes(options.requested)) {
    return options.requested;
  }

  // A region tag such as `de-DE` still counts as a choice of `de`.
  if (typeof options.requested === 'string') {
    const base = normalizeLocale(options.requested, defaultLocale);
    if (allowed.includes(base)) return base;
  }

  return allowed.includes(defaultLocale) ? defaultLocale : allowed[0];
}
