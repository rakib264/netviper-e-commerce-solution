import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultTypographySettings,
  hasTypographyChanged,
  normalizeTypographySettings,
  resolveTypography,
  TYPOGRAPHY_ROLES,
} from '../lib/theme/typography.ts';

test('normalizes single-font mode across all roles', () => {
  const { settings, errors } = normalizeTypographySettings({
    mode: 'single',
    globalFontId: 'inter',
    roles: {
      heading: { fontId: 'inter', weight: 700 },
    },
  });

  assert.equal(errors.length, 0);
  for (const role of TYPOGRAPHY_ROLES) {
    assert.equal(settings.roles[role].fontId, 'inter');
  }
});

test('supports two-font configuration with per-role assignment', () => {
  const { settings, errors } = normalizeTypographySettings({
    mode: 'multi',
    roles: {
      heading: { fontId: 'cormorant-garamond', weight: 600 },
      body: { fontId: 'avenir-next', weight: 400 },
      button: { fontId: 'avenir-next', weight: 600 },
    },
  });

  assert.equal(errors.length, 0);
  assert.equal(settings.roles.heading.fontId, 'cormorant-garamond');
  assert.equal(settings.roles.body.fontId, 'avenir-next');
  assert.equal(settings.roles.button.fontId, 'avenir-next');
});

test('supports three-plus fonts in multi-role mapping', () => {
  const { settings, errors } = normalizeTypographySettings({
    mode: 'multi',
    roles: {
      display: { fontId: 'playfair-display', weight: 700 },
      body: { fontId: 'inter', weight: 400 },
      price: { fontId: 'manrope', weight: 700 },
      caption: { fontId: 'dm-sans', weight: 400 },
    },
  });

  assert.equal(errors.length, 0);
  assert.equal(settings.roles.display.fontId, 'playfair-display');
  assert.equal(settings.roles.body.fontId, 'inter');
  assert.equal(settings.roles.price.fontId, 'manrope');
  assert.equal(settings.roles.caption.fontId, 'dm-sans');
});

test('rejects invalid font ids', () => {
  const { errors } = normalizeTypographySettings({
    mode: 'multi',
    roles: {
      heading: { fontId: 'unknown-font-id', weight: 600 },
    },
  });

  assert.ok(errors.some((error) => error.includes('Invalid font')));
});

test('rejects unsupported font weights', () => {
  const { errors } = normalizeTypographySettings({
    mode: 'multi',
    roles: {
      heading: { fontId: 'libre-baskerville', weight: 900 },
    },
  });

  assert.ok(errors.some((error) => error.includes('not supported')));
});

test('falls back to default typography when missing config', () => {
  const { settings } = normalizeTypographySettings(undefined);
  assert.equal(settings.roles.display.fontId, 'cormorant-garamond');
  assert.equal(settings.roles.body.fontId, 'avenir-next');
});

test('reset default matches configured fallback preset', () => {
  const defaults = createDefaultTypographySettings();
  const resolved = resolveTypography(defaults);

  assert.equal(resolved.settings.roles.display.fontId, 'cormorant-garamond');
  assert.equal(resolved.settings.roles.body.fontId, 'avenir-next');
});

test('generates semantic typography css variables for rendering', () => {
  const resolved = resolveTypography(createDefaultTypographySettings());

  assert.ok(resolved.cssVariables['--font-heading']);
  assert.ok(resolved.cssVariables['--font-body']);
  assert.ok(resolved.cssVariables['--font-button']);
  assert.ok(resolved.cssVariables['--font-price']);
});

test('detects typography signature changes for cache versioning flow', () => {
  const base = createDefaultTypographySettings();
  const changed = {
    ...base,
    mode: 'single' as const,
    globalFontId: 'inter',
  };

  assert.equal(hasTypographyChanged(base, base), false);
  assert.equal(hasTypographyChanged(base, changed), true);
});

test('loads only used google fonts in stylesheet url', () => {
  const resolved = resolveTypography({
    mode: 'multi',
    globalFontId: 'inter',
    roles: {
      display: { fontId: 'cormorant-garamond', weight: 600 },
      heading: { fontId: 'cormorant-garamond', weight: 700 },
      title: { fontId: 'cormorant-garamond', weight: 600 },
      subtitle: { fontId: 'cormorant-garamond', weight: 500 },
      body: { fontId: 'inter', weight: 400 },
      paragraph: { fontId: 'inter', weight: 400 },
      navigation: { fontId: 'inter', weight: 500 },
      button: { fontId: 'inter', weight: 600 },
      price: { fontId: 'inter', weight: 600 },
      label: { fontId: 'inter', weight: 500 },
      caption: { fontId: 'inter', weight: 400 },
    },
  });

  assert.ok(resolved.fontStylesheetHref?.includes('Cormorant+Garamond'));
  assert.ok(resolved.fontStylesheetHref?.includes('Inter'));
  assert.equal(resolved.fontStylesheetHref?.includes('Manrope'), false);
});
