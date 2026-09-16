import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { BRAND, brandSameAs, isPlaceholder, urlFor } from '../lib/seo/brand.ts';

const require = createRequire(import.meta.url);
const nextConfig = require(fileURLToPath(new URL('../next.config.js', import.meta.url)));

/* ── Crawler policy ──────────────────────────────────────────────────────── */

test('every AI crawler robots.txt allows also gets blocking metadata', () => {
  // Next streams metadata by default: the head flushes before the title and
  // description exist, and React hoists them during hydration. A crawler that
  // does not run JavaScript therefore sees a head with no title — which for an
  // answer engine is the entire page. `htmlLimitedBots` is the opt-out, and it
  // has to cover the same crawlers robots.txt invites in.
  assert.ok(
    typeof nextConfig.htmlLimitedBots === 'string' && nextConfig.htmlLimitedBots.length > 0,
    'next.config.js must set htmlLimitedBots',
  );

  const pattern = new RegExp(nextConfig.htmlLimitedBots, 'i');
  const missing = BRAND.aiCrawlers.filter((agent) => !pattern.test(agent));

  assert.deepEqual(
    missing,
    [],
    'these crawlers are allowed in robots.txt but would receive streamed ' +
      'metadata, so their head would have no title or description',
  );
});

test('the built-in crawlers Next blocks for are still covered', () => {
  // Re-declaring Next's default replaces it rather than extending it, so a
  // typo would silently drop every one of these.
  const pattern = new RegExp(nextConfig.htmlLimitedBots, 'i');
  for (const agent of [
    'Bingbot',
    'Slackbot',
    'Twitterbot',
    'LinkedInBot',
    'facebookexternalhit',
    'WhatsApp',
    'Discordbot',
    'Chrome-Lighthouse',
    'DuckDuckBot',
  ]) {
    assert.ok(pattern.test(agent), `${agent} lost its blocking-metadata treatment`);
  }
});

test('an ordinary browser still gets streamed metadata', () => {
  // Blocking metadata for everyone would delay first paint on every request.
  const pattern = new RegExp(nextConfig.htmlLimitedBots, 'i');
  assert.ok(
    !pattern.test(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    ),
  );
});

/* ── Brand centralization ────────────────────────────────────────────────── */

test('urlFor builds absolute URLs with no trailing slash', () => {
  // `next.config.js` sets `trailingSlash: false`, so a canonical carrying one
  // would disagree with the URL that actually serves it.
  assert.equal(urlFor('/'), BRAND.url);
  assert.equal(urlFor(), BRAND.url);
  assert.equal(urlFor('/products'), `${BRAND.url}/products`);
  assert.equal(urlFor('products'), `${BRAND.url}/products`);
  assert.equal(urlFor('/products/'), `${BRAND.url}/products`);
  assert.equal(urlFor('/products?page=2'), `${BRAND.url}/products?page=2`);
  assert.equal(urlFor('/a', 'https://example.com/'), 'https://example.com/a');
});

test('sameAs contains only real profiles', () => {
  // An empty string in `sameAs` tells a crawler to resolve the site's own
  // origin as a social profile.
  assert.deepEqual(brandSameAs({}), []);
  assert.deepEqual(brandSameAs({ facebook: '', instagram: '  ' }), []);
  assert.deepEqual(
    brandSameAs({ instagram: 'https://instagram.com/x', facebook: 'https://fb.com/x' }),
    ['https://fb.com/x', 'https://instagram.com/x'],
  );
  for (const entry of brandSameAs()) assert.ok(entry.trim().length > 0);
});

test('placeholder values are recognisable as placeholders', () => {
  assert.ok(isPlaceholder('TODO_SUPPORT_EMAIL'));
  assert.ok(!isPlaceholder('support@example.com'));
  assert.ok(!isPlaceholder(''));
});

test('the default title fits the space a search result gives it', () => {
  // `buildMetadata` truncates at 60 characters; a default that needs truncating
  // would be ellipsised by its own factory on every page that falls back to it.
  assert.ok(
    BRAND.defaultTitle.length <= 60,
    `defaultTitle is ${BRAND.defaultTitle.length} characters`,
  );
  const suffix = BRAND.titleTemplate.replace('%s', '');
  assert.ok(suffix.length < 30, 'the brand suffix eats the whole title budget');
});

test('the delivery promise is internally consistent', () => {
  // These numbers are quoted by the FAQ copy, the answer blocks and the
  // product schema's shippingDetails. A nationwide window faster than the
  // city one, or a negative charge, would be published in all three.
  const { dhaka, nationwide, freeThreshold, handlingDays } = BRAND.delivery;
  for (const zone of [dhaka, nationwide]) {
    assert.ok(zone.minDays >= 0 && zone.maxDays >= zone.minDays, 'bad delivery window');
    assert.ok(zone.charge >= 0, 'negative delivery charge');
  }
  assert.ok(
    nationwide.maxDays >= dhaka.maxDays,
    'nationwide delivery cannot be faster than the primary city',
  );
  assert.ok(freeThreshold > 0, 'free-delivery threshold must be positive');
  assert.ok(handlingDays.max >= handlingDays.min, 'bad handling window');
});

test('brand locales and currency stay inside their registries', async () => {
  const { SUPPORTED_LOCALES } = await import('../lib/i18n/config.ts');
  const { SUPPORTED_CURRENCIES } = await import('../lib/currency/config.ts');

  assert.ok(SUPPORTED_LOCALES.includes(BRAND.defaultLocale));
  for (const locale of BRAND.supportedLocales) {
    assert.ok(SUPPORTED_LOCALES.includes(locale), `${locale} has no dictionary`);
  }
  assert.ok(SUPPORTED_CURRENCIES.includes(BRAND.currency));
});

test('brand asset paths are root-relative so they resolve from any route', () => {
  for (const asset of [BRAND.logo, BRAND.ogImage, BRAND.favicon, BRAND.appleIcon]) {
    assert.ok(asset.startsWith('/'), `${asset} is not root-relative`);
  }
});
