import 'server-only';

import {
  matchArea,
  matchZone,
  normalizePlaceName,
  type PathaoAddressInput,
} from '@/lib/courier/address';
import { PathaoProvider } from '@/lib/courier/providers/pathao';
import {
  configuredProviders,
  getCourierIntegrationSettings,
  type CourierIntegrationDoc,
} from '@/lib/courier/settings';
import createLogger from '@/lib/logger';
import { unstable_cache } from 'next/cache';

/**
 * Resolving a Bangladeshi postal address to Pathao's numeric city/zone/area ids.
 *
 * Pathao is the only surface in this codebase that cannot take an address as
 * text: `POST /aladdin/api/v1/orders` requires `recipient_city` and
 * `recipient_zone` as integers, and so does the price-plan endpoint. Everything
 * Pathao-shaped therefore funnels through here — the checkout rate quote and
 * the dispatcher both call `resolvePathaoRouting`, so a parcel is priced
 * against exactly the routing it is later booked against.
 *
 * The matching is deliberately conservative. A wrong city id is worse than no
 * city id: it books a real parcel to the wrong end of the country, silently and
 * at the merchant's expense. So nothing here guesses — an unresolved address
 * returns `null` and the caller surfaces it, rather than picking the closest
 * string.
 */

const logger = createLogger('pathao-routing');

export type { PathaoAddressInput };
export { normalizePlaceName };

/** Pathao's geography is effectively static. One day is still conservative. */
const GEO_REVALIDATE = 60 * 60 * 24;

export interface PathaoRouting {
  cityId: number;
  cityName: string;
  zoneId: number;
  zoneName: string;
  areaId?: number;
  areaName?: string;
}

export type PathaoRoutingFailure =
  | 'pathao-not-configured'
  | 'no-district'
  | 'city-unresolved'
  | 'zone-unresolved'
  | 'lookup-failed';

export type PathaoRoutingResult =
  | { ok: true; routing: PathaoRouting }
  | { ok: false; reason: PathaoRoutingFailure; detail?: string };

/**
 * The three geography lists, cached.
 *
 * Every step of the city → zone → area cascade was a live Pathao call on every
 * use — the admin cascade, and now every checkout quote. The lists change on
 * the order of never, so caching them turns a three-call resolution into zero
 * calls for all but the first address of the day.
 */
const getCachedCities = unstable_cache(
  async () => new PathaoProvider(await getCourierIntegrationSettings()).listCities(),
  ['pathao-geo-cities-v1'],
  { revalidate: GEO_REVALIDATE },
);

const getCachedZones = unstable_cache(
  async (cityId: number) =>
    new PathaoProvider(await getCourierIntegrationSettings()).listZones(cityId),
  ['pathao-geo-zones-v1'],
  { revalidate: GEO_REVALIDATE },
);

const getCachedAreas = unstable_cache(
  async (zoneId: number) =>
    new PathaoProvider(await getCourierIntegrationSettings()).listAreas(zoneId),
  ['pathao-geo-areas-v1'],
  { revalidate: GEO_REVALIDATE },
);

/**
 * Address → Pathao routing ids, or a reason it could not be resolved.
 *
 * Never throws: both callers treat an unresolved address as a recoverable
 * state — the quote falls back to the merchant's flat rate, and the dispatcher
 * parks the consignment in the failed lane with the reason attached.
 */
export async function resolvePathaoRouting(
  input: PathaoAddressInput,
  options: { settings?: CourierIntegrationDoc } = {},
): Promise<PathaoRoutingResult> {
  const settings = options.settings ?? (await getCourierIntegrationSettings());
  if (!configuredProviders(settings).includes('pathao')) {
    return { ok: false, reason: 'pathao-not-configured' };
  }

  const districtKey = normalizePlaceName(input.district) || normalizePlaceName(input.city);
  if (!districtKey) {
    return { ok: false, reason: 'no-district' };
  }

  try {
    const cities = await getCachedCities();
    const city =
      cities.find((candidate) => normalizePlaceName(candidate.city_name) === districtKey) ??
      // A customer who typed only the division ("Dhaka") still resolves, because
      // Pathao names its metro cities after the division they sit in.
      cities.find(
        (candidate) =>
          normalizePlaceName(candidate.city_name) === normalizePlaceName(input.division),
      );

    if (!city) {
      return { ok: false, reason: 'city-unresolved', detail: input.district ?? input.city ?? '' };
    }

    const zones = await getCachedZones(city.city_id);
    const zone = matchZone(zones, input);
    if (!zone) {
      return { ok: false, reason: 'zone-unresolved', detail: input.city ?? input.street ?? '' };
    }

    let area: { area_id: number; area_name: string } | null = null;
    try {
      area = matchArea(await getCachedAreas(zone.zone_id), input);
    } catch {
      // The area is optional — a failed area lookup must not lose a good
      // city/zone pair that is already enough to price and book the parcel.
      area = null;
    }

    return {
      ok: true,
      routing: {
        cityId: city.city_id,
        cityName: city.city_name,
        zoneId: zone.zone_id,
        zoneName: zone.zone_name,
        areaId: area?.area_id,
        areaName: area?.area_name,
      },
    };
  } catch (error) {
    logger.error('Pathao routing lookup failed', {
      district: input.district,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      reason: 'lookup-failed',
      detail: error instanceof Error ? error.message : undefined,
    };
  }
}

/**
 * i18n key for a failure reason.
 *
 * The resolver runs server-side and its result is stored on the courier record
 * and read back later, possibly by an admin using a different language — so it
 * returns a key, never a sentence, exactly as the notification catalogue does.
 */
export function pathaoRoutingFailureKey(reason: PathaoRoutingFailure): string {
  return `admin.courier.routing.failure.${reason}`;
}
