import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  buildFontStack,
  getPdfBaseFontForRole,
  resolveTypography,
  TYPOGRAPHY_ROLES,
  type TypographyRole,
} from '../lib/theme/typography.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const GLOBALS_CSS = readFileSync(join(REPO, 'app/globals.css'), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(REPO, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(REPO, rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

const SOURCE_FILES = [...walk('app'), ...walk('components'), ...walk('lib')].filter(
  // The font registry is the one place families are legitimately spelled out.
  (f) => f !== 'lib/theme/typography.ts',
);

test('single mode maps every role to the selected font', () => {
  const { cssVariables, settings } = resolveTypography({
    mode: 'single',
    globalFontId: 'manrope',
    presetId: null,
  });

  const expected = buildFontStack('manrope');
  assert.equal(settings.mode, 'single');
  for (const role of TYPOGRAPHY_ROLES) {
    assert.equal(cssVariables[`--font-${role}`], expected, `role ${role} escaped single mode`);
  }
});

test('multi mode keeps a distinct font per role', () => {
  const roles: Partial<Record<TypographyRole, { fontId: string; weight: number }>> = {
    display: { fontId: 'bodoni-moda', weight: 700 },
    heading: { fontId: 'bodoni-moda', weight: 700 },
    title: { fontId: 'playfair-display', weight: 500 },
    subtitle: { fontId: 'playfair-display', weight: 500 },
    body: { fontId: 'inter', weight: 400 },
    paragraph: { fontId: 'inter', weight: 400 },
    navigation: { fontId: 'inter', weight: 500 },
    button: { fontId: 'inter', weight: 600 },
    label: { fontId: 'dm-sans', weight: 500 },
    caption: { fontId: 'dm-sans', weight: 400 },
    price: { fontId: 'manrope', weight: 700 },
  };

  const { cssVariables } = resolveTypography({ mode: 'multi', presetId: null, roles });

  for (const [role, config] of Object.entries(roles)) {
    assert.equal(
      cssVariables[`--font-${role}`],
      buildFontStack(config!.fontId),
      `role ${role} did not receive its assigned font`,
    );
  }
  // Five distinct families were requested; all five must survive resolution.
  const families = new Set(TYPOGRAPHY_ROLES.map((r) => cssVariables[`--font-${r}`]));
  assert.equal(families.size, 5);
});

test('every role emits a family and a weight variable', () => {
  const { cssVariables } = resolveTypography(null);
  for (const role of TYPOGRAPHY_ROLES) {
    assert.ok(cssVariables[`--font-${role}`], `missing --font-${role}`);
    assert.ok(cssVariables[`--font-weight-${role}`], `missing --font-weight-${role}`);
  }
});

test('every role variable is actually consumed by the stylesheet', () => {
  for (const role of TYPOGRAPHY_ROLES) {
    assert.ok(
      GLOBALS_CSS.includes(`var(--font-${role})`),
      `--font-${role} is declared but never used, so that setting would do nothing`,
    );
  }
});

test('stylesheet declares no literal font family', () => {
  const declarations = GLOBALS_CSS.match(/font-family:[^;}]*/g) || [];
  assert.ok(declarations.length > 0);
  for (const declaration of declarations) {
    const value = declaration.replace('font-family:', '').trim();
    assert.ok(
      value === 'inherit' || value.startsWith('var(--font-'),
      `font-family bypasses the typography tokens: "${declaration}"`,
    );
  }
});

test('no source file hardcodes a font family', () => {
  const BANNED =
    /\b(Playfair|Cormorant|Avenir|Poppins|Montserrat|Roboto|Helvetica|Georgia|Didot|Bodoni|Manrope|Optima|Recoleta|Canela)\b|sans-serif|ui-serif|ui-monospace/;
  const offenders = SOURCE_FILES.filter((f) => BANNED.test(readFileSync(join(REPO, f), 'utf8')));
  assert.deepEqual(offenders, [], `these files bypass the font registry: ${offenders.join(', ')}`);
});

test('pdf generator uses no literal font name', () => {
  // jsPDF cannot embed a themed family, but the built-in it falls back to must
  // still be derived from the selected roles rather than hardcoded.
  const src = readFileSync(join(REPO, 'lib/pdf-simple.ts'), 'utf8');
  const literals = src.match(/setFont\(\s*["'][^"']+["']/g) || [];
  assert.deepEqual(literals, [], `jsPDF font is hardcoded: ${literals.join(', ')}`);
  assert.ok(src.includes('getPdfBaseFontForRole'), 'pdf generator ignores typography settings');
});

test('pdf base font follows the serif/sans character of the selection', () => {
  const serif = { mode: 'multi', presetId: null, roles: { heading: { fontId: 'bodoni-moda', weight: 700 } } };
  const sans = { mode: 'multi', presetId: null, roles: { heading: { fontId: 'inter', weight: 600 } } };
  assert.equal(getPdfBaseFontForRole(serif, 'heading'), 'times');
  assert.equal(getPdfBaseFontForRole(sans, 'heading'), 'helvetica');
  assert.equal(getPdfBaseFontForRole({ mode: 'single', globalFontId: 'manrope', presetId: null }, 'paragraph'), 'helvetica');
});

test('email and pdf surfaces resolve fonts from settings, not a constant', () => {
  for (const file of [
    'lib/utils/email-settings.ts',
    'app/api/admin/orders/[id]/download-pdf/route.ts',
  ]) {
    const src = readFileSync(join(REPO, file), 'utf8');
    assert.ok(src.includes('resolveTypography'), `${file} does not resolve typography`);
  }
});
