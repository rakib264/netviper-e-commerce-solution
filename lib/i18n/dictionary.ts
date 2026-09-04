import bn from '@/locales/bn.json';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n/config';

type RawDictionary = { [key: string]: string | RawDictionary };

/** Values interpolated into a message via `{{name}}` placeholders. */
export type TranslationValues = Record<string, string | number>;

/**
 * Dot-separated path into the dictionary, e.g. `nav.signIn`. Derived from the
 * English file so a typo is a compile error rather than a string that silently
 * renders its own key at runtime.
 */
export type TranslationKey = FlattenKeys<typeof en>;

type FlattenKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : FlattenKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

const RAW_DICTIONARIES: Record<Locale, RawDictionary> = {
  en: en as RawDictionary,
  bn: bn as RawDictionary,
  de: de as RawDictionary,
};

function flatten(source: RawDictionary, prefix = ''): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      output[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(output, flatten(value, path));
    }
  }
  return output;
}

/**
 * Dictionaries are flattened once at module load. They are a few kilobytes each
 * and shared by every locale switch, so eager work here keeps `t()` to a single
 * object lookup on the render path.
 */
const DICTIONARIES: Record<Locale, Record<string, string>> = SUPPORTED_LOCALES.reduce(
  (accumulator, locale) => {
    accumulator[locale] = flatten(RAW_DICTIONARIES[locale]);
    return accumulator;
  },
  {} as Record<Locale, Record<string, string>>,
);

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function interpolate(message: string, values?: TranslationValues): string {
  if (!values) return message;
  return message.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
    const value = values[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function getDictionary(locale: Locale): Record<string, string> {
  return DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Resolve a key in `locale`, falling back to English and finally to the key
 * itself. The English fallback is what lets a partially translated dictionary
 * ship without leaving raw keys on the page.
 */
export function translate(
  locale: Locale,
  key: TranslationKey | (string & {}),
  values?: TranslationValues,
): string {
  const message =
    getDictionary(locale)[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
  return interpolate(message, values);
}

/**
 * Pick between `<key>_one` and `<key>_other` before translating. Both Bangla and
 * German share English's one/other split, so a two-form rule is enough here.
 */
export function translatePlural(
  locale: Locale,
  key: TranslationKey | (string & {}),
  count: number,
  values?: TranslationValues,
): string {
  const suffix = Math.abs(count) === 1 ? 'one' : 'other';
  return translate(locale, `${key}_${suffix}`, { count, ...values });
}

export function createTranslator(localeInput: unknown) {
  const locale = normalizeLocale(localeInput);
  return {
    locale,
    t: (key: TranslationKey | (string & {}), values?: TranslationValues) =>
      translate(locale, key, values),
    tPlural: (
      key: TranslationKey | (string & {}),
      count: number,
      values?: TranslationValues,
    ) => translatePlural(locale, key, count, values),
  };
}
