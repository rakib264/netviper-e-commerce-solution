import { DEFAULT_LOCALE, normalizeLocale, type Locale } from '@/lib/i18n/config';
import {
  translate,
  translatePlural,
  type TranslationKey,
  type TranslationValues,
} from '@/lib/i18n/dictionary';

/**
 * The active locale as a module singleton.
 *
 * The storefront has exactly one language, chosen in admin settings — it is site
 * configuration, not per-user state — so a module-level value is safe on the
 * server as well: every request in a process resolves to the same setting.
 * `LocalizationProvider` writes it during render so that plain (non-hook) calls
 * to `t()` are already correct on the very first paint, on both sides of
 * hydration.
 */
let activeLocale: Locale = DEFAULT_LOCALE;

export function setActiveLocale(value: unknown): Locale {
  activeLocale = normalizeLocale(value);
  return activeLocale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

/** Translate using the active locale. For components, prefer `useTranslation()`. */
export function t(
  key: TranslationKey | (string & {}),
  values?: TranslationValues,
): string {
  return translate(activeLocale, key, values);
}

export function tPlural(
  key: TranslationKey | (string & {}),
  count: number,
  values?: TranslationValues,
): string {
  return translatePlural(activeLocale, key, count, values);
}
