import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CURRENCY_LIST,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  normalizeCurrency,
} from '../lib/currency/config.ts';
import {
  createCurrencyFormatter,
  formatCurrency,
  getActiveCurrency,
  getCurrencySymbol,
  setActiveCurrency,
} from '../lib/currency/format.ts';
import {
  DEFAULT_ALLOWED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LIST,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  normalizeAllowedLocales,
  normalizeLocale,
  resolveActiveLocale,
} from '../lib/i18n/config.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));

type Flat = Record<string, string>;

function flatten(source: Record<string, unknown>, prefix = '', out: Flat = {}): Flat {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else if (value && typeof value === 'object')
      flatten(value as Record<string, unknown>, path, out);
  }
  return out;
}

function readDictionary(locale: string): Flat {
  return flatten(
    JSON.parse(readFileSync(join(REPO, `locales/${locale}.json`), 'utf8')),
  );
}

/* ── Locales ─────────────────────────────────────────────────────────── */

test('every supported locale has a dictionary with the same keys as English', () => {
  const english = readDictionary(DEFAULT_LOCALE);
  const englishKeys = Object.keys(english).sort();
  assert.ok(englishKeys.length > 0, 'English dictionary is empty');

  for (const locale of SUPPORTED_LOCALES) {
    const dictionary = readDictionary(locale);
    assert.deepEqual(
      Object.keys(dictionary).sort(),
      englishKeys,
      `locales/${locale}.json drifted from English`,
    );
    for (const [key, value] of Object.entries(dictionary)) {
      assert.ok(value.trim().length > 0, `${locale}:${key} is blank`);
    }
  }
});

test('locale registry covers exactly the supported locales', () => {
  assert.deepEqual(
    LOCALE_LIST.map((locale) => locale.code),
    [...SUPPORTED_LOCALES],
  );
  assert.ok(SUPPORTED_LOCALES.includes(DEFAULT_LOCALE));
  assert.deepEqual([...SUPPORTED_LOCALES], ['en', 'bn', 'de']);
});

test('normalizeLocale coerces region tags and rejects unknown values', () => {
  assert.equal(normalizeLocale('de-DE'), 'de');
  assert.equal(normalizeLocale('en_US'), 'en');
  assert.equal(normalizeLocale('BN'), 'bn');
  assert.equal(normalizeLocale('fr'), DEFAULT_LOCALE);
  assert.equal(normalizeLocale(undefined), DEFAULT_LOCALE);
  assert.equal(normalizeLocale(null), DEFAULT_LOCALE);
  assert.equal(normalizeLocale(42), DEFAULT_LOCALE);
  assert.ok(isSupportedLocale('bn'));
  assert.ok(!isSupportedLocale('fr'));
});

test('translation falls back to English, then to the key itself', async () => {
  const { translate, translatePlural } = await import('../lib/i18n/dictionary.ts');

  assert.equal(translate('de', 'nav.signIn'), 'Anmelden');
  assert.equal(translate('bn', 'nav.wishlist'), 'উইশলিস্ট');
  // Unknown locales resolve through English rather than rendering nothing.
  assert.equal(translate('en', 'nav.signIn'), 'Sign in');
  assert.equal(translate('de', 'does.not.exist'), 'does.not.exist');

  assert.equal(translatePlural('en', 'cart.itemCount', 1), '1 item');
  assert.equal(translatePlural('en', 'cart.itemCount', 3), '3 items');
  assert.equal(translatePlural('de', 'cart.itemCount', 3), '3 Artikel');
});

test('placeholders are interpolated and unknown ones left intact', async () => {
  const { translate } = await import('../lib/i18n/dictionary.ts');
  assert.equal(translate('en', 'cart.itemCount_other', { count: 7 }), '7 items');
  assert.equal(translate('en', 'cart.itemCount_other'), '{{count}} items');
});

/* ── Currency ────────────────────────────────────────────────────────── */

test('currency registry covers exactly the supported currencies', () => {
  assert.deepEqual(
    CURRENCY_LIST.map((currency) => currency.code),
    [...SUPPORTED_CURRENCIES],
  );
  assert.deepEqual([...SUPPORTED_CURRENCIES], ['BDT', 'USD', 'EUR']);
  assert.ok(SUPPORTED_CURRENCIES.includes(DEFAULT_CURRENCY));
});

test('normalizeCurrency uppercases and rejects unknown codes', () => {
  assert.equal(normalizeCurrency('eur'), 'EUR');
  assert.equal(normalizeCurrency(' usd '), 'USD');
  assert.equal(normalizeCurrency('GBP'), DEFAULT_CURRENCY);
  assert.equal(normalizeCurrency(undefined), DEFAULT_CURRENCY);
  assert.ok(isSupportedCurrency('BDT'));
  assert.ok(!isSupportedCurrency('gbp'));
});

test('each currency formats with its own symbol and placement', () => {
  assert.equal(createCurrencyFormatter('USD').format(1249), '$1,249');
  assert.equal(createCurrencyFormatter('BDT').format(1249), '৳1,249');
  // EUR keeps the pre-existing de-DE presentation: grouped, symbol trailing.
  assert.equal(createCurrencyFormatter('EUR').format(1249), '1.249 €');

  for (const currency of CURRENCY_LIST) {
    assert.equal(getCurrencySymbol(currency.code), currency.symbol);
    assert.ok(
      createCurrencyFormatter(currency.code).format(0).includes(currency.symbol),
    );
  }
});

test('the active currency drives unqualified formatting', () => {
  const original = getActiveCurrency();
  try {
    setActiveCurrency('USD');
    assert.equal(getActiveCurrency(), 'USD');
    assert.equal(formatCurrency(99), '$99');

    setActiveCurrency('EUR');
    assert.equal(formatCurrency(99), '99 €');
    // An explicit currency still wins over the active one.
    assert.equal(formatCurrency(99, { currency: 'BDT' }), '৳99');

    // Unsupported input falls back rather than throwing.
    setActiveCurrency('GBP');
    assert.equal(getActiveCurrency(), DEFAULT_CURRENCY);
  } finally {
    setActiveCurrency(original);
  }
});

test('formatting survives non-finite input and honours option overrides', () => {
  assert.equal(formatCurrency(Number.NaN, { currency: 'USD' }), '$0');
  assert.equal(
    formatCurrency(12.5, { currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 2 }),
    '$12.50',
  );
  assert.equal(formatCurrency(1249, { currency: 'USD', withSymbol: false }), '1,249');
  // A caller-supplied currency style cannot double up the symbol.
  const withCurrencyStyle = { currency: 'USD', style: 'currency' } as const;
  assert.equal(formatCurrency(50, withCurrencyStyle), '$50');
});

/* ── Centralization ──────────────────────────────────────────────────── */

test('the public settings payload normalizes language and currency', async () => {
  const { buildPublicGeneralSettingsPayload } = await import(
    '../lib/theme/general-settings.ts'
  );

  const chosen = buildPublicGeneralSettingsPayload({
    language: 'de',
    currency: 'BDT',
  });
  // The admin's choice is honoured, not silently rewritten to EUR.
  assert.equal(chosen.language, 'de');
  assert.equal(chosen.currency, 'BDT');

  const garbage = buildPublicGeneralSettingsPayload({
    language: 'fr' as never,
    currency: 'GBP' as never,
  });
  assert.ok(SUPPORTED_LOCALES.includes(garbage.language));
  assert.ok(SUPPORTED_CURRENCIES.includes(garbage.currency));
});

test('no shipped component hardcodes a currency symbol in a price', () => {
  // Prices must go through the central formatter, so the symbol can follow the
  // setting. Anything else re-introduces the euro-only behaviour.
  const OFFENDERS = ['components/product-showcase/Price.tsx', 'components/ui/shopping-cart.tsx'];
  for (const file of OFFENDERS) {
    const source = readFileSync(join(REPO, file), 'utf8');
    assert.ok(
      !/[€৳]/.test(source),
      `${file} still writes a currency symbol literally`,
    );
    assert.ok(
      !source.includes('formatEuroCurrency') && !source.includes('formatBDTCurrency'),
      `${file} should use the currency hook rather than a legacy alias`,
    );
  }
});

/* ── Allowed languages ───────────────────────────────────────────────── */

test('normalizeAllowedLocales orders, dedupes and keeps the default', () => {
  assert.deepEqual(normalizeAllowedLocales(['de', 'en', 'de']), ['en', 'bn', 'de'].filter((l) => ['de', 'en'].includes(l)));
  // Registry order wins over the order the array happened to be saved in.
  assert.deepEqual(normalizeAllowedLocales(['de', 'bn', 'en']), [...SUPPORTED_LOCALES]);
  // Unknown codes are dropped rather than poisoning the switcher.
  assert.deepEqual(normalizeAllowedLocales(['fr', 'de'], 'de'), ['de']);
  // An empty or nonsense list falls back to offering everything — including when
  // a default is supplied, so a pre-existing settings document that predates the
  // field does not collapse to a single, unswitchable language.
  assert.deepEqual(normalizeAllowedLocales([]), [...DEFAULT_ALLOWED_LOCALES]);
  assert.deepEqual(normalizeAllowedLocales(null), [...DEFAULT_ALLOWED_LOCALES]);
  assert.deepEqual(normalizeAllowedLocales(undefined, 'bn'), [...DEFAULT_ALLOWED_LOCALES]);
  assert.deepEqual(normalizeAllowedLocales(['fr'], 'bn'), [...DEFAULT_ALLOWED_LOCALES]);
  // The site default can never be excluded from its own allow-list.
  assert.ok(normalizeAllowedLocales(['de'], 'en').includes('en'));
});

test('resolveActiveLocale honours the visitor, then the default', () => {
  const allowed = ['en', 'de'];
  assert.equal(resolveActiveLocale({ requested: 'de', defaultLocale: 'en', allowedLocales: allowed }), 'de');
  // A region tag still counts as choosing that language.
  assert.equal(resolveActiveLocale({ requested: 'de-DE', defaultLocale: 'en', allowedLocales: allowed }), 'de');
  // A choice the admin no longer offers falls back to the default.
  assert.equal(resolveActiveLocale({ requested: 'bn', defaultLocale: 'en', allowedLocales: allowed }), 'en');
  assert.equal(resolveActiveLocale({ requested: undefined, defaultLocale: 'de', allowedLocales: allowed }), 'de');
  // The default is always pulled into the allow-list, so it stays reachable even
  // when the saved list omits it.
  assert.equal(
    resolveActiveLocale({ requested: 'fr', defaultLocale: 'bn', allowedLocales: allowed }),
    'bn',
  );
  assert.ok(normalizeAllowedLocales(allowed, 'bn').includes('bn'));
});

test('the public payload exposes a usable allow-list', async () => {
  const { buildPublicGeneralSettingsPayload } = await import('../lib/theme/general-settings.ts');

  const payload = buildPublicGeneralSettingsPayload({ language: 'de', allowedLanguages: ['de', 'en'] });
  assert.deepEqual(payload.allowedLanguages, ['en', 'de']);
  assert.ok(payload.allowedLanguages.includes(payload.language));

  const narrowed = buildPublicGeneralSettingsPayload({ language: 'bn', allowedLanguages: ['de'] });
  assert.ok(narrowed.allowedLanguages.includes('bn'), 'default must stay selectable');
});

/* ── Coverage ────────────────────────────────────────────────────────── */

test('every t() key used in the app exists in English', () => {
  const english = readDictionary('en');

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(join(REPO, dir))) {
      if (['node_modules', '.next', '.git'].includes(entry)) continue;
      const rel = `${dir}/${entry}`;
      if (statSync(join(REPO, rel)).isDirectory()) walk(rel, out);
      else if (/\.tsx?$/.test(entry)) out.push(rel);
    }
    return out;
  };

  const missing: string[] = [];
  for (const file of [...walk('app'), ...walk('components'), ...walk('lib')]) {
    const src = readFileSync(join(REPO, file), 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
      if (!(m[1] in english)) missing.push(`${file}: ${m[1]}`);
    }
    for (const m of src.matchAll(/\btPlural\(\s*'([\w.]+)'/g)) {
      for (const suffix of ['_one', '_other']) {
        if (!(`${m[1]}${suffix}` in english)) missing.push(`${file}: ${m[1]}${suffix}`);
      }
    }
  }
  assert.deepEqual(missing, [], `keys referenced in code but absent from locales/en.json`);
});

test('placeholders match across every locale', () => {
  const dictionaries = SUPPORTED_LOCALES.map((l) => [l, readDictionary(l)] as const);
  const english = readDictionary('en');
  const problems: string[] = [];

  const placeholders = (s: string) =>
    [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');

  for (const [locale, dict] of dictionaries) {
    if (locale === 'en') continue;
    for (const [key, value] of Object.entries(english)) {
      if (placeholders(value) !== placeholders(dict[key])) {
        problems.push(`${locale}:${key} (en="${placeholders(value)}" ${locale}="${placeholders(dict[key])}")`);
      }
    }
  }
  assert.deepEqual(problems, [], 'a translation dropped or renamed an interpolation placeholder');
});
