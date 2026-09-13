import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchArea,
  matchZone,
  normalizePlaceName,
  resolveZone,
  toKilograms,
  toWeightBucket,
} from '../lib/courier/address.ts';

/**
 * These functions decide where a real parcel is sent and what it is billed at.
 * A wrong zone id is not a rendering bug — it is a box delivered to the wrong
 * end of the country, so the rules are pinned down here rather than trusted.
 */

const zone = (zone_id: number, zone_name: string) => ({ zone_id, zone_name });
const area = (area_id: number, area_name: string, home_delivery_available = true) => ({
  area_id,
  area_name,
  home_delivery_available,
});

test('normalizePlaceName folds punctuation, case and spacing', () => {
  assert.equal(normalizePlaceName("Cox's Bazar"), 'coxsbazar');
  assert.equal(normalizePlaceName('COX S BAZAR'), 'coxsbazar');
  assert.equal(normalizePlaceName('  cox-s-bazar '), 'coxsbazar');
  assert.equal(normalizePlaceName(''), '');
  assert.equal(normalizePlaceName(null), '');
});

test('normalizePlaceName folds the official district renames', () => {
  // Pathao lists the modern spelling; address forms still carry the old one.
  assert.equal(normalizePlaceName('Chittagong'), normalizePlaceName('Chattogram'));
  assert.equal(normalizePlaceName('Comilla'), normalizePlaceName('Cumilla'));
  assert.equal(normalizePlaceName('Barisal'), normalizePlaceName('Barishal'));
  assert.equal(normalizePlaceName('Jessore'), normalizePlaceName('Jashore'));
  assert.equal(normalizePlaceName('Bogra'), normalizePlaceName('Bogura'));
});

test('matchZone prefers an exact town match', () => {
  const zones = [zone(1, 'Uttara'), zone(2, 'Mirpur'), zone(3, 'Banani')];
  assert.equal(matchZone(zones, { city: 'Mirpur' })?.zone_id, 2);
});

test('matchZone falls back to a street token', () => {
  const zones = [zone(1, 'Uttara'), zone(2, 'Mirpur')];
  const found = matchZone(zones, { city: '', street: 'House 4, Road 7, Uttara' });
  assert.equal(found?.zone_id, 1);
});

test('matchZone accepts a containment match only when it is unambiguous', () => {
  const unique = [zone(1, 'Uttara Sector 10'), zone(2, 'Mirpur')];
  assert.equal(matchZone(unique, { city: 'Uttara' })?.zone_id, 1);

  // Two zones contain "uttara" — a guess here would book the wrong one.
  const ambiguous = [zone(1, 'Uttara Sector 10'), zone(2, 'Uttara Sector 12')];
  assert.equal(matchZone(ambiguous, { city: 'Uttara' }), null);
});

test('matchZone refuses short tokens rather than matching loosely', () => {
  // "gul" is under the 4-character floor, so it never reaches containment.
  assert.equal(matchZone([zone(1, 'Gulshan')], { city: 'Gul' }), null);
});

test('matchZone returns null for an unknown address and an empty list', () => {
  assert.equal(matchZone([zone(1, 'Uttara')], { city: 'Nowhere' }), null);
  assert.equal(matchZone([], { city: 'Uttara' }), null);
});

test('matchArea ignores areas without home delivery', () => {
  const areas = [area(1, 'Sector 10', false), area(2, 'Sector 12')];
  assert.equal(matchArea(areas, { city: 'Sector 10' }), null);
  assert.equal(matchArea(areas, { city: 'Sector 12' })?.area_id, 2);
});

test('resolveZone reads Dhaka out of any address field', () => {
  assert.equal(resolveZone({ district: 'Dhaka' }), 'inside-dhaka');
  assert.equal(resolveZone({ city: 'dhaka' }), 'inside-dhaka');
  assert.equal(resolveZone({ division: 'Dhaka' }), 'inside-dhaka');
  assert.equal(resolveZone({ district: 'Chattogram' }), 'outside-dhaka');
  assert.equal(resolveZone({}), 'outside-dhaka');
});

test('toKilograms reads the unit off freeform product weights', () => {
  assert.equal(toKilograms('1.2 kg'), 1.2);
  assert.equal(toKilograms('500g'), 0.5);
  assert.equal(toKilograms(2), 2);
  assert.ok(Math.abs(toKilograms('2 lb') - 0.907184) < 1e-6);
  assert.ok(Math.abs(toKilograms('8 oz') - 0.226796) < 1e-6);
});

test('toKilograms bills an unusable weight at the minimum, never at zero', () => {
  assert.equal(toKilograms(undefined), 0.5);
  assert.equal(toKilograms(''), 0.5);
  assert.equal(toKilograms('unknown'), 0.5);
  assert.equal(toKilograms(0), 0.5);
});

test('toKilograms does not read the g in kg as grams', () => {
  assert.equal(toKilograms('1.5kg'), 1.5);
});

test('toWeightBucket rounds up to the half-kilo Pathao bills in', () => {
  assert.equal(toWeightBucket(0.1), 0.5);
  assert.equal(toWeightBucket(0.5), 0.5);
  assert.equal(toWeightBucket(0.6), 1);
  assert.equal(toWeightBucket(1.0), 1);
  assert.equal(toWeightBucket(1.2), 1.5);
});
