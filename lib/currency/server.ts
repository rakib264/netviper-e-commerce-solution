import 'server-only';

import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
  type CurrencyCode,
} from '@/lib/currency/config';
import { createCurrencyFormatter, formatCurrency } from '@/lib/currency/format';
import { getCachedLocalizationSettings } from '@/lib/theme/general-settings-server';

/**
 * The store's configured currency, on the server.
 *
 * `setActiveCurrency` is only ever called by `LocalizationProvider`, i.e. in the
 * browser — so the module-level active currency that `formatCurrency` reads is
 * still the shipped default in any server context. Server code that renders an
 * amount (a notification, an email, an invoice, a JSON-LD block) therefore has
 * to ask for the setting explicitly rather than assume the singleton was set.
 *
 * Falls back to `DEFAULT_CURRENCY`, never to a specific currency: a settings
 * read failing is not a reason to start quoting prices in the wrong money.
 */
export async function getServerCurrency(): Promise<CurrencyCode> {
  try {
    const { currency } = await getCachedLocalizationSettings();
    return normalizeCurrency(currency);
  } catch (error) {
    console.error('[currency] settings read failed, using default:', error);
    return DEFAULT_CURRENCY;
  }
}

/** A formatter bound to the store's configured currency. */
export async function getServerCurrencyFormatter(): Promise<
  (value: number) => string
> {
  return createCurrencyFormatter(await getServerCurrency()).format;
}

/** Format one amount in the store's configured currency. */
export async function formatServerCurrency(value: number): Promise<string> {
  return formatCurrency(value, { currency: await getServerCurrency() });
}
