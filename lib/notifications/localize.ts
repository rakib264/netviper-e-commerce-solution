import { SUPPORTED_LOCALES } from '@/lib/i18n/config';
import { BRAND } from '@/lib/seo/brand';
import { translate } from '@/lib/i18n/dictionary';
import type { LocalizedText } from '@/lib/onesignal';
import type { TranslationValues } from '@/lib/i18n/dictionary';

/**
 * Render one locale key into every language OneSignal will be given.
 *
 * Push copy has to be materialised at send time — OneSignal stores strings, not
 * keys — but it still has to come *out of the locale files*, not out of the call
 * site. The previous event helpers inlined en/bn/de literals in TypeScript,
 * which put user-facing copy outside the dictionary the i18n rule and the
 * key-tree test both govern.
 *
 * Every supported locale is filled, so adding a language to
 * `SUPPORTED_LOCALES` extends push automatically; a key missing from a
 * translation falls back to English inside `translate`.
 */
export function localizeForPush(
  key: string,
  params?: TranslationValues,
): LocalizedText {
  const withBrand = withBrandParam(params);
  const rendered = {} as Record<string, string>;
  for (const locale of SUPPORTED_LOCALES) {
    rendered[locale] = translate(locale, key, withBrand);
  }
  return rendered as LocalizedText;
}

/**
 * Add `{{brand}}` to a notification's params.
 *
 * The store's name is ambient, not per-notification data, so threading it
 * through every call site would be forty places to forget it. Supplying it here
 * lets notification copy say "Welcome to {{brand}}" instead of baking a name
 * into the dictionary — which is what left a dead brand in the welcome message
 * through two rebrands. A row written years ago renders with today's name,
 * because the row stores the key and never the sentence.
 *
 * A caller-supplied `brand` still wins, so nothing here can override real data.
 */
export function withBrandParam(params?: TranslationValues): TranslationValues {
  return { brand: BRAND.name, ...(params || {}) };
}
