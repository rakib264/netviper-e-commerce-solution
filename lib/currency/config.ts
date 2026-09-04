/**
 * Currency registry.
 *
 * One place defines which currencies exist, how each is written, and what the
 * fallback is. The Mongoose enum, the admin API validation, the admin picker and
 * every price on the storefront all read from here.
 */

export const SUPPORTED_CURRENCIES = ['BDT', 'USD', 'EUR'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'BDT';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /**
   * Locale used purely for digit grouping and the decimal mark. Intentionally
   * not the "native" locale of the currency: `bn-BD` would emit Bengali digits,
   * which can differ between the Node and browser ICU builds and produce a
   * hydration mismatch.
   */
  numberLocale: string;
  symbolPosition: 'prefix' | 'suffix';
  /** Non-breaking space between symbol and amount, when the convention wants one. */
  spaced: boolean;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
}

const NBSP = ' ';

export const CURRENCY_REGISTRY: Record<CurrencyCode, CurrencyMeta> = {
  BDT: {
    code: 'BDT',
    symbol: '৳',
    label: 'Bangladeshi Taka',
    numberLocale: 'en-US',
    symbolPosition: 'prefix',
    spaced: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'US Dollar',
    numberLocale: 'en-US',
    symbolPosition: 'prefix',
    spaced: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'Euro',
    // `1.234,56 €` — matches the pre-existing `de-DE` currency formatting so the
    // storefront's rendered prices are unchanged for the current EUR setting.
    numberLocale: 'de-DE',
    symbolPosition: 'suffix',
    spaced: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
};

export const CURRENCY_LIST: CurrencyMeta[] = SUPPORTED_CURRENCIES.map(
  (code) => CURRENCY_REGISTRY[code],
);

export const CURRENCY_SPACER = NBSP;

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return (
    typeof value === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

export function normalizeCurrency(
  value: unknown,
  fallback: CurrencyCode = DEFAULT_CURRENCY,
): CurrencyCode {
  if (isSupportedCurrency(value)) return value;
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (isSupportedCurrency(upper)) return upper;
  }
  return fallback;
}

export function getCurrencyMeta(value: unknown): CurrencyMeta {
  return CURRENCY_REGISTRY[normalizeCurrency(value)];
}
