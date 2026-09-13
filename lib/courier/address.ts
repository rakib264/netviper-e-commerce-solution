/**
 * Pure address and parcel arithmetic, deliberately free of `server-only`.
 *
 * These are the decisions that book a real parcel: which Pathao city an address
 * belongs to, which zone inside it, and what the parcel weighs. A wrong answer
 * here is not a slow page — it is a box sent to the other end of the country at
 * the merchant's expense. Keeping them pure and importable is what lets
 * `tests/courier-address.test.ts` pin the matching rules down; the modules that
 * hold the Mongoose and Pathao calls re-export from here.
 */

import { parseMeasurementNumber } from '@/lib/products/measurements';

/**
 * Spellings Bangladesh officially renamed but every address form still carries
 * both of. Pathao's own list uses the modern spelling, and a customer typing
 * the old one must not fall through to "unresolved".
 */
const CITY_ALIASES: Record<string, string> = {
  chittagong: 'chattogram',
  comilla: 'cumilla',
  barisal: 'barishal',
  jessore: 'jashore',
  bogra: 'bogura',
  moulvibazar: 'maulvibazar',
  maulvibazar: 'maulvibazar',
  netrokona: 'netrakona',
  brahmanbaria: 'brahamanbaria',
  brahamanbaria: 'brahamanbaria',
  jhalokati: 'jhalakathi',
  jhalakathi: 'jhalakathi',
};

/**
 * Lowercase, strip everything that is not a letter or digit, then fold the
 * known renames. `Cox's Bazar`, `coxs bazar` and `COX'S BAZAR` all collapse to
 * one key, which is what makes an exact comparison safe enough to trust.
 */
export function normalizePlaceName(value: string | null | undefined): string {
  if (!value) return '';
  const flat = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CITY_ALIASES[flat] ?? flat;
}

/** `Dhaka Sadar` → ['dhaka','sadar'], for token-level zone matching. */
export function addressTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

export interface PathaoAddressInput {
  /** The `district` field of a shipping address — matched against Pathao cities. */
  district?: string | null;
  /** Town/thana. Matched against Pathao zones inside the resolved city. */
  city?: string | null;
  /** Only used to disambiguate a district that is also a division name. */
  division?: string | null;
  /** Street line. Its tokens are the last resort for a zone match. */
  street?: string | null;
}

export interface PathaoZoneLike {
  zone_id: number;
  zone_name: string;
}

export interface PathaoAreaLike {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
}

/**
 * Picks the zone for an address inside an already-resolved city.
 *
 * Three passes, narrowest first: an exact normalised match on the town field,
 * then an exact match on any street token, then a containment match. The
 * containment pass is why `Uttara Sector 10` finds the `Uttara` zone — but it
 * only runs when exactly one zone contains the token, so an ambiguous address
 * returns null rather than picking the first hit.
 */
export function matchZone<T extends PathaoZoneLike>(
  zones: T[],
  input: PathaoAddressInput,
): T | null {
  if (!zones.length) return null;

  const candidates = [normalizePlaceName(input.city), normalizePlaceName(input.district)].filter(
    Boolean,
  );

  for (const candidate of candidates) {
    const exact = zones.find((zone) => normalizePlaceName(zone.zone_name) === candidate);
    if (exact) return exact;
  }

  const streetTokens = addressTokens(input.street);
  for (const token of streetTokens) {
    const exact = zones.find((zone) => normalizePlaceName(zone.zone_name) === token);
    if (exact) return exact;
  }

  for (const token of [...candidates, ...streetTokens]) {
    if (token.length < 4) continue;
    const contained = zones.filter((zone) => normalizePlaceName(zone.zone_name).includes(token));
    // Exactly one, or it is a guess.
    if (contained.length === 1) return contained[0];
  }

  return null;
}

/** The area is optional for both Pathao endpoints, so a miss is not a failure. */
export function matchArea<T extends PathaoAreaLike>(
  areas: T[],
  input: PathaoAddressInput,
): T | null {
  const deliverable = areas.filter((area) => area.home_delivery_available);
  if (!deliverable.length) return null;

  const candidates = [normalizePlaceName(input.city), ...addressTokens(input.street)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const exact = deliverable.find((area) => normalizePlaceName(area.area_name) === candidate);
    if (exact) return exact;
  }
  return null;
}

export type ShippingZone = 'inside-dhaka' | 'outside-dhaka';

/** Dhaka is the only zone either provider prices differently by name. */
export function resolveZone(address: PathaoAddressInput): ShippingZone {
  const haystack = `${address.district ?? ''} ${address.city ?? ''} ${address.division ?? ''}`
    .toLowerCase()
    .trim();
  return haystack.includes('dhaka') ? 'inside-dhaka' : 'outside-dhaka';
}

/** Minimum billable parcel, and the floor both providers apply anyway. */
export const MIN_WEIGHT_KG = 0.5;

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

  // Kilograms and milligrams are tested before bare grams, because "1.5kg" and
  // "200mg" both end in a `g` that a grams test would otherwise claim.
  if (text.includes('kg')) return value;
  if (text.includes('mg')) return value / 1_000_000;

  // A `g` directly after the digits ("500g", "500 g") or the spelled-out unit.
  // An earlier `\bg\b` here never matched "500g" — there is no word boundary
  // between `0` and `g` — so a half-kilo product billed as half a tonne.
  if (/\d\s*g\b|gram/.test(text)) return value / 1000;

  return value;
}

/** Pathao bills in half-kilo steps; quoting in finer ones only wastes calls. */
export function toWeightBucket(weightKg: number): number {
  return Math.max(MIN_WEIGHT_KG, Math.ceil(weightKg * 2) / 2);
}
