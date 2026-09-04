import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CURATED_SECTIONS } from '../lib/curated-sections/defaults.ts';
import {
  CURATED_ORIGINS,
  defaultCtaHref,
  normalizeCuratedSection,
  originForAutoSource,
  originLabelKey,
  resolveCtaHref,
  slugifyKey,
  toCuratedSection,
  toPublicProduct,
  type AdminCuratedProduct,
} from '../lib/curated-sections/types.ts';
import {
  HOMEPAGE_SECTION_KEYS,
  curatedSlotKey,
  isCuratedSlotKey,
  isDynamicSlotKey,
  isHomepageSectionKey,
  isShowcaseSlotKey,
  mergeHomepageSections,
  metaForSectionKey,
  parseCuratedSlotKey,
  showcaseSlotKey,
} from '../lib/landing/homepage-sections.ts';

const ID_A = '507f1f77bcf86cd799439011';
const ID_B = '507f1f77bcf86cd799439012';

/* ── Slots ──────────────────────────────────────────────────────────────── */

test('curated slot keys are distinct from showcase slot keys', () => {
  const curated = curatedSlotKey(ID_A);
  const showcase = showcaseSlotKey(ID_A);

  assert.notEqual(curated, showcase);
  assert.ok(isCuratedSlotKey(curated));
  assert.ok(!isCuratedSlotKey(showcase));
  assert.ok(!isShowcaseSlotKey(curated));
  assert.equal(parseCuratedSlotKey(curated), ID_A);
  assert.equal(parseCuratedSlotKey(showcase), null);

  for (const key of [curated, showcase]) {
    assert.ok(isDynamicSlotKey(key));
    assert.ok(isHomepageSectionKey(key));
  }
});

test('both dynamic families merge into one homepage order', () => {
  // Every static slot is seeded in practice, so the stored list is complete.
  // A partial one would let unstored keys fall back to their shipped order.
  const stored = HOMEPAGE_SECTION_KEYS.map((key, index) => ({
    key,
    sortOrder: (index + 1) * 10,
  }));

  const merged = mergeHomepageSections([
    ...stored,
    { key: curatedSlotKey(ID_A), sortOrder: 15, isEnabled: true },
    { key: showcaseSlotKey(ID_B), sortOrder: 25, isEnabled: true },
  ] as any);

  const order = merged.map((section) => section.key);
  assert.deepEqual(order.slice(0, 5), [
    'heroCarousel',
    curatedSlotKey(ID_A),
    'activeDeals',
    showcaseSlotKey(ID_B),
    'categories',
  ]);
});

test('a curated slot is hidden when its stored document says so', () => {
  const merged = mergeHomepageSections([
    { key: curatedSlotKey(ID_A), sortOrder: 5, isEnabled: false },
  ] as any);
  const slot = merged.find((section) => section.key === curatedSlotKey(ID_A));
  assert.equal(slot?.isEnabled, false);
});

test('curated slot metadata is labelled by the section name', () => {
  const meta = metaForSectionKey(curatedSlotKey(ID_A), {
    curated: [
      { id: ID_A, label: 'Best Selling', sourceMode: 'hybrid', isActive: true },
    ],
  });
  assert.equal(meta?.label, 'Best Selling');
  assert.equal(meta?.supportsHeader, false);
  assert.equal(meta?.curated?.sourceMode, 'hybrid');
  // A curated slot carries no showcase descriptor, and vice versa.
  assert.equal(meta?.showcase, undefined);
});

/* ── Internal labels never reach the storefront ─────────────────────────── */

test('the public product shape carries no origin', () => {
  const admin = {
    _id: ID_A,
    name: 'Bag',
    slug: 'bag',
    href: '/products/bag',
    category: { label: 'Bags', link: '/categories/bags' },
    images: ['/a.jpg'],
    price: 100,
    origin: 'auto-best-selling',
  } as AdminCuratedProduct;

  const publicProduct = toPublicProduct(admin);
  assert.equal('origin' in publicProduct, false);
  // Everything else survives.
  assert.equal(publicProduct.name, 'Bag');
  assert.equal(publicProduct.price, 100);
  // The admin object is not mutated in the process.
  assert.equal(admin.origin, 'auto-best-selling');
});

test('every origin maps to a distinct admin label key', () => {
  const keys = CURATED_ORIGINS.map(originLabelKey);
  assert.equal(new Set(keys).size, CURATED_ORIGINS.length);
  for (const key of keys) {
    assert.ok(key.startsWith('admin.curatedSections.origin.'));
  }
});

test('auto sources are tagged with their own origin', () => {
  assert.equal(originForAutoSource('best-selling'), 'auto-best-selling');
  assert.equal(originForAutoSource('new-arrivals'), 'auto-new');
  assert.equal(originForAutoSource('featured'), 'auto-featured');
  assert.equal(originForAutoSource('limited-edition'), 'auto-limited');
  assert.equal(originForAutoSource('category'), 'auto-category');
  assert.equal(originForAutoSource('latest'), 'auto-latest');
});

/* ── View routes ────────────────────────────────────────────────────────── */

test('each auto source points at its existing catalogue page', () => {
  const base = { sourceMode: 'auto' as const, categorySlug: '' };
  assert.equal(
    defaultCtaHref({ ...base, autoSource: 'featured' }),
    '/products/featured',
  );
  assert.equal(
    defaultCtaHref({ ...base, autoSource: 'new-arrivals' }),
    '/products/new-arrivals',
  );
  assert.equal(
    defaultCtaHref({ ...base, autoSource: 'best-selling' }),
    '/products/best-selling',
  );
  assert.equal(
    defaultCtaHref({ ...base, autoSource: 'limited-edition' }),
    '/products/limited-edition',
  );
  assert.equal(
    defaultCtaHref({ ...base, autoSource: 'category', categorySlug: 'bags' }),
    '/categories/bags',
  );
  // A category source with no slug has nowhere specific to go.
  assert.equal(defaultCtaHref({ ...base, autoSource: 'category' }), '/products');
  // Hand-picked sections have no generated listing behind them.
  assert.equal(
    defaultCtaHref({ sourceMode: 'manual', autoSource: 'featured', categorySlug: '' }),
    '/products',
  );
});

test('an explicit route wins over the generated one', () => {
  const section = toCuratedSection({
    _id: ID_A,
    key: 'x',
    sourceMode: 'auto',
    autoSource: 'featured',
    ctaHref: '/collections/holiday',
  });
  assert.equal(resolveCtaHref(section), '/collections/holiday');

  const blank = toCuratedSection({
    _id: ID_A,
    key: 'x',
    sourceMode: 'auto',
    autoSource: 'featured',
    ctaHref: '   ',
  });
  assert.equal(resolveCtaHref(blank), '/products/featured');
});

/* ── Normalisation ──────────────────────────────────────────────────────── */

test('a key is derived from the label when none is given', () => {
  const { value, errors } = normalizeCuratedSection({ label: 'Best Selling!' });
  assert.deepEqual(errors, []);
  assert.equal(value.key, 'best-selling');
  // The title falls back to the label verbatim — it is display copy, so the
  // punctuation the slug drops is kept.
  assert.equal(value.title, 'Best Selling!');
});

test('slugifyKey collapses punctuation and trims separators', () => {
  assert.equal(slugifyKey('  New   Arrivals!! '), 'new-arrivals');
  assert.equal(slugifyKey('---'), '');
});

test('a partial update keeps the stored values it omits', () => {
  const current = toCuratedSection({
    _id: ID_A,
    key: 'best-selling',
    label: 'Best Selling',
    title: 'Best Sellers',
    subtitle: 'Ranked by sales.',
    sourceMode: 'hybrid',
    autoSource: 'best-selling',
    manualProductIds: [ID_B],
    variant: 'rail',
    limit: 10,
    isActive: true,
  });

  // The live toggle sends nothing but `isActive`.
  const { value, errors } = normalizeCuratedSection({ isActive: false }, current);
  assert.deepEqual(errors, []);
  assert.equal(value.isActive, false);
  assert.equal(value.label, 'Best Selling');
  assert.equal(value.title, 'Best Sellers');
  assert.equal(value.sourceMode, 'hybrid');
  assert.equal(value.variant, 'rail');
  assert.deepEqual(value.manualProductIds, [ID_B]);
  assert.equal(value.limit, 10);
});

test('manual picks are validated, deduplicated and capped', () => {
  const { value } = normalizeCuratedSection({
    label: 'Picks',
    sourceMode: 'manual',
    manualProductIds: [ID_A, ID_A, 'not-an-id', ID_B, ''],
  });
  assert.deepEqual(value.manualProductIds, [ID_A, ID_B]);
});

test('a manual section with no products is rejected', () => {
  const { errors } = normalizeCuratedSection({
    label: 'Picks',
    sourceMode: 'manual',
    manualProductIds: [],
  });
  assert.ok(errors.some((error) => error.includes('at least one product')));
});

test('a category source without a slug is rejected', () => {
  const { errors } = normalizeCuratedSection({
    label: 'Bags',
    sourceMode: 'auto',
    autoSource: 'category',
  });
  assert.ok(errors.some((error) => error.includes('category slug')));
});

test('the limit is clamped rather than rejected', () => {
  assert.equal(normalizeCuratedSection({ label: 'a', limit: 500 }).value.limit, 24);
  assert.equal(normalizeCuratedSection({ label: 'a', limit: 0 }).value.limit, 1);
  assert.equal(normalizeCuratedSection({ label: 'a', limit: 'x' }).value.limit, 8);
});

test('unknown enum values fall back instead of persisting', () => {
  const { value } = normalizeCuratedSection({
    label: 'a',
    variant: 'carousel',
    sourceMode: 'psychic',
    autoSource: 'vibes',
  });
  assert.equal(value.variant, 'grid');
  assert.equal(value.sourceMode, 'auto');
  assert.equal(value.autoSource, 'latest');
});

/* ── Seed data ──────────────────────────────────────────────────────────── */

test('the shipped sections are valid and uniquely keyed', () => {
  const keys = DEFAULT_CURATED_SECTIONS.map((section) => section.key);
  assert.equal(new Set(keys).size, keys.length);

  for (const section of DEFAULT_CURATED_SECTIONS) {
    const { errors } = normalizeCuratedSection(section);
    assert.deepEqual(errors, [], `${section.key} is invalid`);
    assert.equal(section.isActive, true);
  }
});

test('no shipped section duplicates the static featuredProducts slot', () => {
  // Seeding a curated "Featured" band would render the same products twice on
  // every existing install, next to the static slot that already shows them.
  for (const section of DEFAULT_CURATED_SECTIONS) {
    assert.notEqual(section.autoSource, 'featured');
  }
});

test('best selling ships as hybrid so pins and sales data coexist', () => {
  const bestSelling = DEFAULT_CURATED_SECTIONS.find(
    (section) => section.key === 'best-selling',
  );
  assert.ok(bestSelling);
  assert.equal(bestSelling!.sourceMode, 'hybrid');
  assert.equal(bestSelling!.autoSource, 'best-selling');
});
