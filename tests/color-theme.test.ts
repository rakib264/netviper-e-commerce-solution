import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  COLOR_PRESET_LIST,
  applyColorPreset,
  contrastRatio,
  createDefaultColorSettings,
  hasColorsChanged,
  normalizeColorSettings,
  resolveColors,
} from '../lib/theme/colors.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const TAILWIND = readFileSync(join(REPO, 'tailwind.config.ts'), 'utf8');
const GLOBALS = readFileSync(join(REPO, 'app/globals.css'), 'utf8');

/** The semantic contract from the reference architecture. */
const REQUIRED_TOKENS = [
  '--background', '--foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--destructive', '--destructive-foreground',
  '--border', '--input', '--ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--sidebar', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
];

test('every preset produces an accessible palette in light and dark', () => {
  for (const preset of COLOR_PRESET_LIST) {
    const resolved = resolveColors({ presetId: preset.id });
    const failures = resolved.contrast.filter((check) => !check.passes);
    assert.deepEqual(
      failures.map((f) => `${f.token} on ${f.against} = ${f.ratio}`),
      [],
      `${preset.name} has contrast failures`,
    );
  }
});

test('hand-picked and hostile colour pairs stay accessible', () => {
  const cases = [
    ['#1A1A1A', '#F5F5F3'], // the shipped brand pair
    ['#FFFFFF', '#FFFEFE'], // no contrast to work with
    ['#000000', '#000000'], // identical and black
    ['#00FF00', '#FF00FF'], // out-of-gamut neon
    ['#7F7F7F', '#7F7F7F'], // mid grey, zero chroma
  ];
  for (const [primaryColor, secondaryColor] of cases) {
    const resolved = resolveColors({ presetId: null, primaryColor, secondaryColor });
    const failures = resolved.contrast.filter((check) => !check.passes);
    assert.deepEqual(failures, [], `${primaryColor}/${secondaryColor} failed`);
  }
});

test('the full semantic token contract is emitted for both appearances', () => {
  const resolved = resolveColors(createDefaultColorSettings());
  for (const token of REQUIRED_TOKENS) {
    assert.ok(resolved.light[token], `light is missing ${token}`);
    assert.ok(resolved.dark[token], `dark is missing ${token}`);
  }
  assert.deepEqual(
    Object.keys(resolved.light).sort(),
    Object.keys(resolved.dark).sort(),
    'light and dark must expose an identical token set',
  );
});

test('every token Tailwind consumes is actually generated', () => {
  // A token referenced by the config but never emitted renders as `transparent`,
  // which is invisible in review and obvious in production.
  const resolved = resolveColors(createDefaultColorSettings());
  const referenced = new Set(
    [...TAILWIND.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]),
  );
  const ignore = new Set(['--radius', '--radix-accordion-content-height', '--tw-gradient-stops']);
  const missing = [...referenced].filter(
    (token) => !ignore.has(token) && !token.startsWith('--font') && !(token in resolved.light),
  );
  assert.deepEqual(missing, [], `Tailwind references ungenerated tokens: ${missing.join(', ')}`);
});

test('preset selection and custom edits behave as the UI implies', () => {
  const preset = applyColorPreset('grocery-organic');
  assert.ok(preset);
  assert.equal(preset!.presetId, 'grocery-organic');

  // Diverging from a preset must detach it, otherwise the UI would keep claiming
  // a preset that no longer describes the colours.
  const edited = normalizeColorSettings({
    presetId: 'grocery-organic',
    primaryColor: '#123456',
    secondaryColor: preset!.secondaryColor,
  });
  assert.equal(edited.settings.presetId, null);
  assert.equal(edited.settings.primaryColor, '#123456');

  const untouched = normalizeColorSettings(preset);
  assert.equal(untouched.settings.presetId, 'grocery-organic');
});

test('invalid input is rejected rather than silently accepted', () => {
  const bad = normalizeColorSettings({ presetId: null, primaryColor: 'not-a-colour' });
  assert.ok(bad.errors.some((e) => e.includes('Primary colour')));
  assert.equal(bad.settings.primaryColor, createDefaultColorSettings().primaryColor);

  const badPreset = normalizeColorSettings({ presetId: 'does-not-exist' });
  assert.ok(badPreset.errors.some((e) => e.includes('Unknown colour preset')));
});

test('change detection drives cache versioning', () => {
  const base = createDefaultColorSettings();
  assert.equal(hasColorsChanged(base, base), false);
  assert.equal(hasColorsChanged(base, { ...base, primaryColor: '#3E6B44' }), true);
  assert.equal(hasColorsChanged(base, applyColorPreset('bold-ember')), true);
});

test('changing the brand pair actually changes every surface', () => {
  const a = resolveColors({ presetId: 'grocery-organic' });
  const b = resolveColors({ presetId: 'electronics-indigo' });
  const differing = REQUIRED_TOKENS.filter((t) => a.light[t] !== b.light[t]);
  // Foregrounds may legitimately coincide; surfaces and brand tokens must not.
  for (const token of ['--background', '--primary', '--accent', '--border', '--ring', '--chart-1']) {
    assert.ok(differing.includes(token), `${token} did not respond to the palette change`);
  }
});

test('the stylesheet contains no colour override that could beat the theme', () => {
  const offenders = GLOBALS.split('\n').filter(
    (line) =>
      line.includes('!important') &&
      /color|background|border|fill|stroke/.test(line) &&
      !/pointer-events|placeholder:text-muted-foreground|color: black/.test(line),
  );
  assert.deepEqual(offenders, [], 'hardcoded !important colour rules are back');
});

test('tailwind declares no literal colour', () => {
  const literals = TAILWIND.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  assert.deepEqual(literals, [], `tailwind.config.ts hardcodes colours: ${literals?.join(', ')}`);
});

test('legacy brand hexes are gone from component classes', () => {
  const legacy = ['1A1A1A', 'E2E0DC', '8C8A85', '55534E', 'F5F5F3', 'EDEDEB', '333330'];
  const pattern = legacy.map((h) => `\\[#${h}\\]`).join('|');
  const found = execSync(
    `grep -rEoh "(text|bg|border|ring|fill|stroke|from|to|via|placeholder|divide|outline)-(${pattern})" ` +
      `--include='*.tsx' app components || true`,
    { cwd: REPO, encoding: 'utf8' },
  ).trim();
  assert.equal(found, '', `components still hardcode brand colours:\n${found}`);
});

test('foreground pairings hold at the stated ratios', () => {
  const { lightHex, darkHex } = resolveColors(createDefaultColorSettings());
  for (const palette of [lightHex, darkHex]) {
    assert.ok(contrastRatio(palette['--foreground'], palette['--background']) >= 7);
    assert.ok(contrastRatio(palette['--primary-foreground'], palette['--primary']) >= 4.5);
    assert.ok(contrastRatio(palette['--subtle-foreground'], palette['--background']) >= 4.5);
  }
});

test('the success toast is painted from the primary token, not a fixed green', () => {
  const toast = readFileSync(join(REPO, 'components/ui/toast.tsx'), 'utf8');
  const variant = /success:\s*'([^']*)'/.exec(toast);
  assert.ok(variant, 'the success toast variant is gone');

  // Success is the brand's confirmation, so its surface has to follow the
  // Primary colour chosen in Settings — resolved through CSS variables at
  // runtime, which is what `bg-primary` compiles to.
  assert.match(variant[1], /\bbg-primary\b/);
  assert.match(variant[1], /\btext-primary-foreground\b/);
  assert.ok(
    !/success-\d{2,3}/.test(variant[1]),
    `the success toast still reaches for the green ramp: ${variant[1]}`,
  );

  // And the icon and close affordance sitting on that surface pair with it.
  const toaster = readFileSync(join(REPO, 'components/ui/toaster.tsx'), 'utf8');
  assert.match(toaster, /case 'success':\s*\n\s*return <CheckCircle className="[^"]*text-primary-foreground/);

  // No toast variant may carry a literal colour — the whole set has to stay
  // re-themeable from Settings.
  for (const file of ['components/ui/toast.tsx', 'components/ui/toaster.tsx']) {
    const source = readFileSync(join(REPO, file), 'utf8');
    const literals = source.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\(/g) || [];
    assert.deepEqual(literals, [], `${file} hardcodes a colour: ${literals.join(', ')}`);
  }
});

test('every foreground token stays readable on any preset, including success', () => {
  for (const preset of COLOR_PRESET_LIST) {
    const { lightHex, darkHex } = resolveColors(
      applyColorPreset(createDefaultColorSettings(), preset.id),
    );
    for (const palette of [lightHex, darkHex]) {
      // The success toast puts primary-foreground text on a primary surface, so
      // that one pairing carries the contrast for every chosen brand colour.
      assert.ok(
        contrastRatio(palette['--primary-foreground'], palette['--primary']) >= 4.5,
        `preset ${preset.id} fails primary-foreground on primary`,
      );
    }
  }
});

