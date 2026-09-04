import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIN_COMPONENTS,
  comboSlugify,
  computeComboSavings,
  deriveComboType,
  isScheduleLive,
  normalizeComboBundle,
  sumComponentListPrices,
} from '../lib/combo-bundles/types.ts';

const ID_A = '507f1f77bcf86cd799439011';
const ID_B = '507f1f77bcf86cd799439012';
const ID_C = '507f1f77bcf86cd799439013';

/* ── Naming rule ─────────────────────────────────────────────────────────── */

test('two products is a combo, three or more is a bundle', () => {
  assert.equal(deriveComboType(2), 'combo');
  assert.equal(deriveComboType(3), 'bundle');
  assert.equal(deriveComboType(12), 'bundle');
  // Below the minimum the type is still reported, so a half-built draft in the
  // admin form has something to render.
  assert.equal(deriveComboType(0), 'combo');
  assert.equal(deriveComboType(1), 'combo');
});

/* ── Pricing ─────────────────────────────────────────────────────────────── */

test('the compare-at total is the components at their own quantities', () => {
  assert.equal(
    sumComponentListPrices([
      { unitPrice: 350, qty: 1 },
      { unitPrice: 495, qty: 2 },
    ]),
    350 + 990,
  );
  // A missing price contributes nothing rather than NaN-ing the whole sum.
  assert.equal(sumComponentListPrices([{ unitPrice: 0, qty: 3 }]), 0);
});

test('savings are only reported when the offer is genuinely cheaper', () => {
  const saving = computeComboSavings(800, 1000);
  assert.equal(saving.savings, 200);
  assert.equal(saving.savingsPercent, 20);

  // Priced at or above the components: nothing to boast about, and no badge.
  assert.deepEqual(computeComboSavings(1000, 1000), {
    compareAtPrice: 1000,
    savings: 0,
    savingsPercent: 0,
  });
  assert.equal(computeComboSavings(1200, 1000).savings, 0);
  // No compare-at at all (every component priced at zero) cannot be a discount.
  assert.equal(computeComboSavings(500, 0).savingsPercent, 0);
});

/* ── Schedule ────────────────────────────────────────────────────────────── */

test('an offer with no dates is always live, and a window is honoured', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  assert.ok(isScheduleLive(null, null, now));
  assert.ok(isScheduleLive('2026-06-01T00:00:00Z', '2026-07-01T00:00:00Z', now));
  assert.ok(!isScheduleLive('2026-07-01T00:00:00Z', null, now));
  assert.ok(!isScheduleLive(null, '2026-06-01T00:00:00Z', now));
});

/* ── Validation ──────────────────────────────────────────────────────────── */

const validBody = {
  name: 'Brooklyn & Tabby duo',
  price: 800,
  components: [
    { productId: ID_A, qty: 1 },
    { productId: ID_B, qty: 2 },
  ],
};

test('a valid two-product offer normalizes cleanly', () => {
  const { value, errors } = normalizeComboBundle(validBody);
  assert.deepEqual(errors, []);
  assert.equal(value.slug, 'brooklyn-tabby-duo');
  assert.equal(value.components.length, 2);
  assert.equal(value.components[1].qty, 2);
  // Sort order is assigned from the submitted order, densely.
  assert.deepEqual(
    value.components.map((component) => component.sortOrder),
    [0, 1],
  );
});

test('an offer needs at least two products and a price', () => {
  const single = normalizeComboBundle({
    ...validBody,
    components: [{ productId: ID_A, qty: 1 }],
  });
  assert.ok(
    single.errors.some((message) => message.includes(String(MIN_COMPONENTS))),
    'the component floor is reported',
  );

  const free = normalizeComboBundle({ ...validBody, price: 0 });
  assert.ok(free.errors.some((message) => /price/i.test(message)));

  const nameless = normalizeComboBundle({ ...validBody, name: '  ' });
  assert.ok(nameless.errors.some((message) => /name/i.test(message)));
});

test('the same product twice is rejected unless the variants differ', () => {
  const duplicate = normalizeComboBundle({
    ...validBody,
    components: [
      { productId: ID_A, qty: 1 },
      { productId: ID_A, qty: 1 },
    ],
  });
  assert.ok(duplicate.errors.some((message) => /already/i.test(message)));

  // Two colourways of one product is a legitimate combo.
  const variants = normalizeComboBundle({
    ...validBody,
    components: [
      { productId: ID_A, variantId: 'v-cognac', qty: 1 },
      { productId: ID_A, variantId: 'v-black', qty: 1 },
    ],
  });
  assert.deepEqual(variants.errors, []);
  assert.equal(variants.value.components.length, 2);
});

test('an invalid product id is reported rather than silently dropped', () => {
  const { errors } = normalizeComboBundle({
    ...validBody,
    components: [{ productId: 'not-an-id', qty: 1 }, { productId: ID_B, qty: 1 }],
  });
  assert.ok(errors.some((message) => /invalid product/i.test(message)));
});

test('component quantities are clamped to a sane range', () => {
  const { value } = normalizeComboBundle({
    ...validBody,
    components: [
      { productId: ID_A, qty: 0 },
      { productId: ID_B, qty: 999 },
      { productId: ID_C, qty: 2.7 },
    ],
  });
  assert.deepEqual(
    value.components.map((component) => component.qty),
    [1, 20, 2],
  );
});

test('a schedule window must run forwards', () => {
  const { errors } = normalizeComboBundle({
    ...validBody,
    startsAt: '2026-07-01T00:00:00Z',
    endsAt: '2026-06-01T00:00:00Z',
  });
  assert.ok(errors.some((message) => /end date/i.test(message)));
});

test('a slug is derived from the name and kept url-safe', () => {
  assert.equal(comboSlugify('  Brooklyn & Tabby — Duo!  '), 'brooklyn-tabby-duo');
  assert.equal(normalizeComboBundle(validBody).value.slug, 'brooklyn-tabby-duo');
  // An explicit slug wins, still normalized.
  assert.equal(
    normalizeComboBundle({ ...validBody, slug: 'Autumn Pair' }).value.slug,
    'autumn-pair',
  );
});

test('an unpriced compare-at override falls back to computing it', () => {
  assert.equal(normalizeComboBundle(validBody).value.compareAtPrice, 0);
  assert.equal(
    normalizeComboBundle({ ...validBody, compareAtPrice: 1340 }).value.compareAtPrice,
    1340,
  );
  // Nonsense is treated as "compute it" rather than stored.
  assert.equal(
    normalizeComboBundle({ ...validBody, compareAtPrice: -5 }).value.compareAtPrice,
    0,
  );
});
