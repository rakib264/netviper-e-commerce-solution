import {
  CURRENCY_SPACER,
  DEFAULT_CURRENCY,
  getCurrencyMeta,
  normalizeCurrency,
  type CurrencyCode,
  type CurrencyMeta,
} from '@/lib/currency/config';

export interface FormatCurrencyOptions extends Intl.NumberFormatOptions {
  /** Format in a specific currency instead of the site-wide active one. */
  currency?: CurrencyCode | string;
  /** Render the number only, without the symbol. */
  withSymbol?: boolean;
}

/**
 * Site-wide currency as a module singleton.
 *
 * Like the active locale this is configuration rather than per-user state, so a
 * process-wide value is correct on the server too. Keeping it here is what lets
 * ~20 existing `formatBDTCurrency(price)` call sites become settings-driven
 * without threading a currency prop through every price in the catalogue.
 */
let activeCurrency: CurrencyCode = DEFAULT_CURRENCY;

export function setActiveCurrency(value: unknown): CurrencyCode {
  activeCurrency = normalizeCurrency(value);
  return activeCurrency;
}

export function getActiveCurrency(): CurrencyCode {
  return activeCurrency;
}

export function getActiveCurrencyMeta(): CurrencyMeta {
  return getCurrencyMeta(activeCurrency);
}

export function getCurrencySymbol(currency?: CurrencyCode | string): string {
  return getCurrencyMeta(currency ?? activeCurrency).symbol;
}

function attachSymbol(amount: string, meta: CurrencyMeta): string {
  const spacer = meta.spaced ? CURRENCY_SPACER : '';
  return meta.symbolPosition === 'prefix'
    ? `${meta.symbol}${spacer}${amount}`
    : `${amount}${spacer}${meta.symbol}`;
}

/**
 * Format a price in the active (or an explicitly given) currency.
 *
 * The symbol is attached by hand rather than via `style: 'currency'`: ICU's
 * symbol choice for a currency outside its home locale varies between runtimes,
 * and a server/client disagreement there shows up as a hydration error.
 */
export function formatCurrency(
  value: number,
  options: FormatCurrencyOptions = {},
): string {
  const { currency, withSymbol = true, ...numberOptions } = options;
  const meta = getCurrencyMeta(currency ?? activeCurrency);

  if (value === null || value === undefined || Number.isNaN(value)) {
    return withSymbol ? attachSymbol('0', meta) : '0';
  }

  const resolved: Intl.NumberFormatOptions = {
    minimumFractionDigits: meta.minimumFractionDigits,
    maximumFractionDigits: meta.maximumFractionDigits,
    ...numberOptions,
    // A caller-supplied `style: 'currency'` would double up on the symbol we
    // attach ourselves, so the numeric style is always enforced.
    style: 'decimal',
  };

  /*
   * Reconcile the two fraction-digit bounds.
   *
   * `Intl.NumberFormat` throws a RangeError when the minimum exceeds the
   * maximum, and that combination is easy to reach honestly: a caller asking
   * for two decimals (an SMS rate of 0.50, say) against a currency whose
   * registry entry renders whole units only. Raising the ceiling to meet the
   * caller's floor is what they meant — the alternative is a thrown format that
   * degrades to an unseparated `String(value)`.
   */
  if (
    resolved.minimumFractionDigits !== undefined &&
    resolved.maximumFractionDigits !== undefined &&
    resolved.minimumFractionDigits > resolved.maximumFractionDigits
  ) {
    resolved.maximumFractionDigits = resolved.minimumFractionDigits;
  }

  let amount: string;
  try {
    amount = new Intl.NumberFormat(meta.numberLocale, resolved).format(value);
  } catch {
    amount = String(value);
  }

  return withSymbol ? attachSymbol(amount, meta) : amount;
}

/** Bind a formatter to one currency — handy for admin previews. */
export function createCurrencyFormatter(currency: CurrencyCode | string) {
  const meta = getCurrencyMeta(currency);
  return {
    meta,
    format: (value: number, options: Intl.NumberFormatOptions = {}) =>
      formatCurrency(value, { ...options, currency: meta.code }),
  };
}
