import type { TranslationValues } from '@/lib/i18n/dictionary';

/**
 * Params whose value is a monetary amount.
 *
 * Notifications created from now on store these already formatted, in the
 * store's configured currency, because the copy template no longer carries a
 * symbol.
 */
const MONEY_PARAMS = new Set(['total']);

/** A bare number, i.e. a value written before the amount was pre-formatted. */
const UNFORMATTED_AMOUNT = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Backfill the currency symbol on notifications stored before this change.
 *
 * `notifications.events.adminNewOrder.body` used to read `Total: €{{total}}`
 * with `total` passed as a bare `"809.00"`. The literal `€` is gone from the
 * template — it was showing euros on a taka store — so those historical rows
 * would now render "Total: 809.00" with no symbol at all.
 *
 * Rather than migrate the collection, the value is normalised at render time: a
 * money param that still looks like a bare number is formatted here, and one
 * that already carries a symbol is passed through untouched. Old rows therefore
 * render in whichever currency the *reader* is viewing, which is the same
 * treatment a new row gets.
 */
export function withFormattedMoneyParams(
  params: TranslationValues | undefined,
  formatPrice: (value: number) => string,
): TranslationValues {
  if (!params) return {};

  let changed = false;
  const next: TranslationValues = { ...params };

  for (const key of MONEY_PARAMS) {
    const value = next[key];
    if (typeof value === 'number') {
      next[key] = formatPrice(value);
      changed = true;
      continue;
    }
    if (typeof value !== 'string' || !UNFORMATTED_AMOUNT.test(value.trim())) continue;

    const amount = Number(value.trim().replace(',', '.'));
    if (!Number.isFinite(amount)) continue;

    next[key] = formatPrice(amount);
    changed = true;
  }

  return changed ? next : params;
}
