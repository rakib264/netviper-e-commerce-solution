import 'server-only';

import { PathaoProvider } from '@/lib/courier/providers/pathao';
import { resolvePathaoRouting, type PathaoRouting } from '@/lib/courier/pathao-routing';
import {
  configuredProviders,
  getCourierIntegrationSettings,
  type CourierIntegrationDoc,
} from '@/lib/courier/settings';
import createLogger from '@/lib/logger';
import { unstable_cache } from 'next/cache';
import CourierSettings from '@/lib/models/CourierSettings';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { parseMeasurementNumber } from '@/lib/products/measurements';

/**
 * The one place a shipping price is decided.
 *
 * Checkout, order creation and the courier record all used to compute shipping
 * for themselves — checkout from two fields of the public settings endpoint,
 * order creation from `data.shippingCost || 60` (i.e. from whatever the browser
 * sent), and the courier record from a third branch over the same table. Three
 * answers to one question, and the only one the customer was charged against
 * was the one they controlled.
 *
 * Now every caller asks `quoteShipping` and gets the same number. The quote is
 * derived from the address and the *server's* view of the cart — never from a
 * client-supplied weight or amount.
 *
 * ## Why the default is a merchant rate, not the carrier's
 *
 * This mirrors how large storefronts actually price delivery. Amazon does not
 * show you its negotiated carrier rate; Shopify ships flat/zone rates by
 * default and treats carrier-calculated shipping as an opt-in for merchants who
 * ship with that one carrier. The reasons are structural, not cosmetic:
 *
 *  - The customer's price must not depend on which carrier an admin picks
 *    *after* the order, or the merchant eats the spread.
 *  - A checkout must not fail, stall or change its total because a carrier API
 *    is slow or down.
 *  - Only Pathao can quote at all here. Steadfast has no price endpoint — its
 *    rate is a per-merchant negotiated flat rate — so a carrier-only design
 *    cannot price a Steadfast order at all.
 *
 * So: flat zone rates are the floor that always works, and
 * `carrierCalculatedRates` layers a live Pathao quote on top for merchants who
 * want it. What the carrier *actually* charged is recorded separately on the
 * courier record as `providerDeliveryFee`, which is the honest number for
 * margin reporting and never touches what the customer paid.
 */

const logger = createLogger('shipping-rates');

export type ShippingRateSource = 'free-threshold' | 'carrier' | 'flat';
export type ShippingZone = 'inside-dhaka' | 'outside-dhaka';

export interface ShippingQuote {
  /** What the customer is charged, in the store's configured currency. */
  amount: number;
  source: ShippingRateSource;
  zone: ShippingZone;
  /** Set only when `source === 'carrier'`. */
  provider?: 'pathao';
  /** Server-resolved billable weight, in kilograms. */
  weightKg: number;
  /** Pathao routing, when it resolved — reused by the dispatcher. */
  pathaoRouting?: PathaoRouting;
}

export interface ShippingQuoteAddress {
  district?: string | null;
  city?: string | null;
  division?: string | null;
  street?: string | null;
}

export interface ShippingQuoteLine {
  productId: string;
  quantity: number;
}

export interface ShippingQuoteInput {
  address: ShippingQuoteAddress;
  /** Product lines. Weight is resolved server-side; a client weight is ignored. */
  lines: ShippingQuoteLine[];
  /** Goods total after discounts, for the free-delivery threshold. */
  subtotal: number;
}

/** Minimum billable parcel, and the floor both providers apply anyway. */
const MIN_WEIGHT_KG = 0.5;

/**
 * `Product.weight` is a freeform string ("500g", "1.2 kg", "2 lb"), so the unit
 * has to be read off the text rather than assumed. Anything unparseable bills
 * at the minimum rather than at zero.
 */
export function toKilograms(raw: unknown): number {
  const value = parseMeasurementNumber(raw as any);
  if (!value) return MIN_WEIGHT_KG;

  const text = String(raw ?? '').toLowerCase();
  if (text.includes('oz')) return value * 0.0283495;
  if (text.includes('lb') || text.includes('pound')) return value * 0.453592;
  if (text.includes('mg')) return value / 1_000_000;
  // Bare grams, but not "kg" — checked after kg so "1.5kg" is not read as grams.
  if (/\bg\b|gram/.test(text) && !text.includes('kg')) return value / 1000;
  return value;
}

/** Dhaka is the only zone either provider prices differently by name. */
export function resolveZone(address: ShippingQuoteAddress): ShippingZone {
  const haystack = `${address.district ?? ''} ${address.city ?? ''} ${address.division ?? ''}`
    .toLowerCase()
    .trim();
  return haystack.includes('dhaka') ? 'inside-dhaka' : 'outside-dhaka';
}

/** Billable weight for a cart, read from the catalogue rather than the request. */
async function resolveWeightKg(lines: ShippingQuoteLine[]): Promise<number> {
  const ids = [...new Set(lines.map((line) => line.productId).filter(Boolean))];
  if (!ids.length) return MIN_WEIGHT_KG;

  await connectDB();
  const products = await Product.find({ _id: { $in: ids } })
    .select('weight')
    .lean();

  const byId = new Map(products.map((product: any) => [String(product._id), product.weight]));
  const total = lines.reduce((sum, line) => {
    const weight = byId.get(String(line.productId));
    // A line whose product no longer exists still occupies space in the box.
    return sum + toKilograms(weight) * Math.max(1, line.quantity || 1);
  }, 0);

  return Math.max(MIN_WEIGHT_KG, Number(total.toFixed(3)));
}

export interface MerchantRateTable {
  insideDhaka: number;
  outsideDhaka: number;
  freeDeliveryThreshold: number;
}

/** The merchant's own zone rates. Always available, and always the fallback. */
export async function getMerchantRateTable(): Promise<MerchantRateTable> {
  await connectDB();
  const settings = await CourierSettings.findOne()
    .select('deliveryCharges freeDeliveryThreshold')
    .lean();

  const charges = (settings as any)?.deliveryCharges ?? {};
  return {
    insideDhaka: Number(charges.regularWithinDhaka ?? 60),
    outsideDhaka: Number(charges.regularOutsideDhaka ?? 120),
    freeDeliveryThreshold: Number((settings as any)?.freeDeliveryThreshold ?? 0),
  };
}

/**
 * Pathao's price for a (city, zone, weight) triple, cached.
 *
 * The quote endpoint is public and unauthenticated — guest checkout needs it —
 * so without a cache a script could spend the merchant's Pathao rate-limit one
 * request at a time. Weight is bucketed to the half-kilo Pathao itself bills in,
 * which collapses an unbounded key space onto the handful of prices that
 * actually exist for a zone.
 */
const getCachedCarrierPrice = unstable_cache(
  async (cityId: number, zoneId: number, weightKg: number): Promise<number> => {
    const settings = await getCourierIntegrationSettings();
    const quote = await new PathaoProvider(settings).calculatePrice({
      recipientCity: cityId,
      recipientZone: zoneId,
      itemWeight: weightKg,
    });
    return Number(quote?.price);
  },
  ['pathao-price-quote-v1'],
  // Short enough that a published rate change reaches checkout the same hour.
  { revalidate: 3600 },
);

/** Pathao bills in half-kilo steps; quoting in finer ones only wastes calls. */
function toWeightBucket(weightKg: number): number {
  return Math.max(0.5, Math.ceil(weightKg * 2) / 2);
}

/**
 * Quotes delivery for one cart at one address.
 *
 * Never throws. A quote is on the checkout critical path, so every failure
 * inside it degrades to the merchant's flat rate rather than blocking the sale.
 */
export async function quoteShipping(
  input: ShippingQuoteInput,
  options: { settings?: CourierIntegrationDoc } = {},
): Promise<ShippingQuote> {
  const zone = resolveZone(input.address);
  const table = await getMerchantRateTable();
  const flatAmount = zone === 'inside-dhaka' ? table.insideDhaka : table.outsideDhaka;

  const weightKg = await resolveWeightKg(input.lines).catch(() => MIN_WEIGHT_KG);

  // The threshold wins over every other source: a merchant who promised free
  // delivery above a number has already decided what this order costs.
  if (table.freeDeliveryThreshold > 0 && input.subtotal >= table.freeDeliveryThreshold) {
    return { amount: 0, source: 'free-threshold', zone, weightKg };
  }

  const settings = options.settings ?? (await getCourierIntegrationSettings());
  if (!settings.carrierCalculatedRates || !configuredProviders(settings).includes('pathao')) {
    return { amount: flatAmount, source: 'flat', zone, weightKg };
  }

  const routing = await resolvePathaoRouting(input.address, { settings });
  if (!routing.ok) {
    // Expected for any address Pathao does not cover. The flat rate is the
    // right answer, not an error — the customer never sees a failed quote.
    return { amount: flatAmount, source: 'flat', zone, weightKg };
  }

  try {
    const price = await getCachedCarrierPrice(
      routing.routing.cityId,
      routing.routing.zoneId,
      toWeightBucket(weightKg),
    );
    if (!Number.isFinite(price) || price <= 0) {
      return { amount: flatAmount, source: 'flat', zone, weightKg, pathaoRouting: routing.routing };
    }

    return {
      amount: Math.round(price),
      source: 'carrier',
      provider: 'pathao',
      zone,
      weightKg,
      pathaoRouting: routing.routing,
    };
  } catch (error) {
    logger.error('Carrier rate quote failed, falling back to the flat rate', {
      zone,
      error: error instanceof Error ? error.message : String(error),
    });
    return { amount: flatAmount, source: 'flat', zone, weightKg, pathaoRouting: routing.routing };
  }
}
