import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { SUPPORTED_CURRENCIES } from '../lib/currency/config.ts';
import { formatCurrency } from '../lib/currency/format.ts';
import { withFormattedMoneyParams } from '../lib/notifications/money-params.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOCALE_DIR = join(REPO_ROOT, 'locales');

const SYMBOLS = ['€', '৳', '$'];

/**
 * Directories worth scanning. `node_modules`, build output and the tests
 * themselves are excluded; so is `lib/currency`, which is where the symbols
 * legitimately live.
 */
const SCAN_ROOTS = ['app', 'components', 'lib', 'hooks'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'tests', '.git']);
const ALLOWED_FILES = new Set([
  'lib/currency/config.ts',
  'lib/currency/format.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (['.ts', '.tsx'].includes(extname(full))) out.push(full);
  }
  return out;
}

/**
 * A currency symbol immediately followed by a template hole or a JSX
 * expression — `৳${amount}`, `€{order.total}` — which is the shape that
 * hardcodes a currency onto a dynamic amount. A symbol next to a literal number
 * ("2000 €") is a business constant and is not what this guards.
 *
 * `$` is deliberately excluded: in TypeScript it is also the start of every
 * `${…}` template hole, so including it makes the pattern match every template
 * literal in the repo. It is still checked in the locale-template test below,
 * where there is no template syntax to confuse it with.
 */
const DYNAMIC_MONEY = /[€৳]\s*(?:\$\{|\{)/;

test('no currency symbol is hardcoded onto a dynamic amount', () => {
  const offenders: string[] = [];

  for (const root of SCAN_ROOTS) {
    for (const file of walk(join(REPO_ROOT, root))) {
      const rel = relative(REPO_ROOT, file).split('\\').join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!DYNAMIC_MONEY.test(line)) return;
          // A doc comment describing the old behaviour is not a violation.
          const trimmed = line.trim();
          if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
          offenders.push(`${rel}:${index + 1}  ${trimmed}`);
        });
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Format money through lib/currency instead of hardcoding a symbol:\n${offenders.join('\n')}`,
  );
});

test('no component builds its own currency Intl formatter', () => {
  const offenders: string[] = [];
  const pattern = /style:\s*['"]currency['"]/;

  for (const root of SCAN_ROOTS) {
    for (const file of walk(join(REPO_ROOT, root))) {
      const rel = relative(REPO_ROOT, file).split('\\').join('/');
      if (ALLOWED_FILES.has(rel)) continue;

      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!pattern.test(line)) return;
          const trimmed = line.trim();
          if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
          offenders.push(`${rel}:${index + 1}  ${trimmed}`);
        });
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Use formatCurrency from lib/currency/format instead:\n${offenders.join('\n')}`,
  );
});

test('notification copy templates bake in no currency symbol', () => {
  for (const locale of readdirSync(LOCALE_DIR)) {
    if (!locale.endsWith('.json')) continue;

    const dictionary = JSON.parse(
      readFileSync(join(LOCALE_DIR, locale), 'utf8'),
    ) as Record<string, any>;
    const events = dictionary.notifications?.events || {};

    for (const [event, copy] of Object.entries(events)) {
      for (const [field, value] of Object.entries(copy as Record<string, string>)) {
        for (const symbol of SYMBOLS) {
          assert.ok(
            !String(value).includes(symbol),
            `${locale} notifications.events.${event}.${field} contains "${symbol}". ` +
              'The amount param arrives already formatted in the store currency.',
          );
        }
      }
    }
  }
});

test('a caller asking for decimals gets them, whatever the currency', () => {
  // BDT renders whole units by default. Asking for two decimals used to make
  // Intl throw (min > max), which fell back to an unseparated `String(value)`.
  assert.equal(
    formatCurrency(0.5, { currency: 'BDT', minimumFractionDigits: 2 }),
    '৳0.50',
  );
  assert.equal(
    formatCurrency(1234.5, { currency: 'BDT', minimumFractionDigits: 2 }),
    '৳1,234.50',
  );
  // The default is untouched: whole units, with grouping.
  assert.equal(formatCurrency(1234.5, { currency: 'BDT' }), '৳1,235');
});

test('every supported currency has a distinct symbol', () => {
  const symbols = SUPPORTED_CURRENCIES.map((code) => code);
  assert.equal(new Set(symbols).size, symbols.length);
});

test('legacy notification money params are formatted at render time', () => {
  const formatPrice = (value: number) => `৳${value}`;

  // A row stored before amounts were pre-formatted.
  assert.deepEqual(
    withFormattedMoneyParams({ orderNumber: 'ORD-1', total: '809.00' }, formatPrice),
    { orderNumber: 'ORD-1', total: '৳809' },
  );

  // A row stored after: already formatted, so it must pass through untouched.
  assert.deepEqual(
    withFormattedMoneyParams({ orderNumber: 'ORD-1', total: '৳809' }, formatPrice),
    { orderNumber: 'ORD-1', total: '৳809' },
  );

  // A numeric param is formatted too.
  assert.deepEqual(
    withFormattedMoneyParams({ total: 42 }, formatPrice),
    { total: '৳42' },
  );

  // Non-money params are never touched, and neither is a missing one.
  assert.deepEqual(
    withFormattedMoneyParams({ orderNumber: '42' }, formatPrice),
    { orderNumber: '42' },
  );
  assert.deepEqual(withFormattedMoneyParams(undefined, formatPrice), {});
});
