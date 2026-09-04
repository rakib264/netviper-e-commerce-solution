import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeHomepageSections,
  normalizeSettings,
} from '../lib/landing/homepage-sections.ts';
import {
  normalizeAdvertisementPayload,
  resolveAdMedia,
  toAdvertisementDTO,
} from '../lib/advertisements/types.ts';

test('ad section settings default to the multi layout', () => {
  const { settings } = normalizeSettings('horizontalAdvertisements', {});
  assert.equal(settings.layout, 'multi');
  assert.equal(settings.limit, 3);
  assert.equal(settings.autoplayVideo, true);
});

test('a stale stored limit is clamped rather than rejected', () => {
  const merged = mergeHomepageSections([
    { key: 'verticalAdvertisements', settings: { limit: 4 } as any },
  ]);
  const vertical = merged.find((s) => s.key === 'verticalAdvertisements')!;
  assert.equal(vertical.settings.limit, 3);
  assert.equal(vertical.settings.layout, 'multi');
});

test('an unknown layout falls back through the select validator', () => {
  const { settings, errors } = normalizeSettings('horizontalAdvertisements', {
    layout: 'carousel',
  });
  assert.equal(settings.layout, 'multi');
  assert.equal(errors.length, 1);
});

test('a legacy image-only document resolves to an image ad', () => {
  const dto = toAdvertisementDTO({
    _id: 'a',
    type: 'horizontal',
    position: 1,
    title: 'Legacy',
    bannerImage: 'https://cdn/img.png',
    isActive: true,
  });
  assert.equal(dto.mediaType, 'image');
  assert.equal(dto.mediaUrl, 'https://cdn/img.png');
  assert.equal(dto.posterImage, 'https://cdn/img.png');
});

test('a legacy document holding a video in bannerImage never becomes a poster', () => {
  const media = resolveAdMedia({
    mediaType: undefined as any,
    mediaUrl: '',
    posterImage: undefined,
    bannerImage: 'https://cdn/videos/clip.mp4',
  });
  assert.equal(media.mediaType, 'video');
  assert.equal(media.url, 'https://cdn/videos/clip.mp4');
  assert.equal(media.poster, '');
});

test('a video payload mirrors only the poster into bannerImage', () => {
  const { value, errors } = normalizeAdvertisementPayload({
    type: 'vertical',
    position: 1,
    title: 'Clip',
    mediaType: 'video',
    mediaUrl: 'https://cdn/videos/clip.mp4',
    posterImage: 'https://cdn/images/poster.jpg',
    cta: { label: 'Shop', url: '/products' },
  });
  assert.deepEqual(errors, []);
  assert.equal(value.bannerImage, 'https://cdn/images/poster.jpg');
  assert.equal(value.mediaType, 'video');
});

test('a half-filled call to action is rejected', () => {
  const { errors } = normalizeAdvertisementPayload({
    type: 'horizontal',
    position: 1,
    title: 'Ad',
    mediaUrl: 'https://cdn/img.png',
    cta: { label: 'Shop', url: '' },
  });
  assert.ok(errors.some((e) => e.includes('call to action')));
});

test('a fourth position is out of range', () => {
  const { errors } = normalizeAdvertisementPayload({
    type: 'horizontal',
    position: 4,
    title: 'Ad',
    mediaUrl: 'https://cdn/img.png',
  });
  assert.ok(errors.some((e) => e.includes('Position')));
});

test('a partial update validates only what it was given', () => {
  const { value, errors } = normalizeAdvertisementPayload(
    { discountText: '  20% off  ' },
    { partial: true },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(value, { discountText: '20% off' });
});
