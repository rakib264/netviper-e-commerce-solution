import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOMEPAGE_SECTION_KEYS,
  isHomepageSectionKey,
  isShowcaseSlotKey,
  mergeHomepageSections,
  metaForSectionKey,
  parseShowcaseSlotKey,
  showcaseSlotKey,
} from '../lib/landing/homepage-sections.ts';
import {
  normalizeShowcaseBody,
  serializeShowcaseSection,
} from '../lib/product-showcase/normalize.ts';
import {
  CARD_STYLE_OPTIONS,
  TEMPLATE_OPTIONS,
  mediaRatio,
  resolveMediaFraming,
  resolveShowcaseTemplate,
  resolveSplitPanelMedia,
  splitPanelHasContent,
  templateLabelKey,
} from '../lib/product-showcase/types.ts';

const ID_A = '507f1f77bcf86cd799439011';
const ID_B = '507f1f77bcf86cd799439012';

/* ── Showcase slots in the homepage order ───────────────────────────────── */

test('a showcase slot key round-trips and rejects anything else', () => {
  const key = showcaseSlotKey(ID_A);
  assert.equal(key, `productShowcase:${ID_A}`);
  assert.ok(isShowcaseSlotKey(key));
  assert.equal(parseShowcaseSlotKey(key), ID_A);

  // The retired aggregate slot is not a slot key any more.
  assert.ok(!isShowcaseSlotKey('productShowcase'));
  assert.ok(!isShowcaseSlotKey('productShowcase:nope'));
  assert.equal(parseShowcaseSlotKey('categories'), null);
});

test('slot keys are accepted by the same validator as the static keys', () => {
  assert.ok(isHomepageSectionKey('categories'));
  assert.ok(isHomepageSectionKey(showcaseSlotKey(ID_A)));
  assert.ok(!isHomepageSectionKey('productShowcase'));
  assert.ok(!isHomepageSectionKey('nope'));
});

test('showcase slots merge into the order alongside the static sections', () => {
  // Every static slot is seeded in practice, so the stored list is complete.
  const stored = HOMEPAGE_SECTION_KEYS.map((key, index) => ({
    key,
    sortOrder: (index + 1) * 10,
  }));

  const merged = mergeHomepageSections([
    ...stored,
    // Two showcases, deliberately interleaved with the static slots.
    { key: showcaseSlotKey(ID_A), sortOrder: 15, isEnabled: true },
    { key: showcaseSlotKey(ID_B), sortOrder: 35, isEnabled: true },
  ] as any);

  const order = merged.map((section) => section.key);
  assert.deepEqual(order.slice(0, 6), [
    'heroCarousel',
    showcaseSlotKey(ID_A),
    'activeDeals',
    'categories',
    showcaseSlotKey(ID_B),
    'productListing',
  ]);

  // Every static slot still renders, whether or not it was stored.
  for (const key of HOMEPAGE_SECTION_KEYS) assert.ok(order.includes(key));
});

test('a stored slot toggled off keeps its hidden state', () => {
  const merged = mergeHomepageSections([
    { key: showcaseSlotKey(ID_A), sortOrder: 2, isEnabled: false },
  ] as any);
  const slot = merged.find((section) => section.key === showcaseSlotKey(ID_A));
  assert.ok(slot);
  assert.equal(slot!.isEnabled, false);
});

test('a slot with no stored document is not invented', () => {
  const merged = mergeHomepageSections([{ key: 'heroCarousel', sortOrder: 1 }] as any);
  assert.ok(!merged.some((section) => isShowcaseSlotKey(section.key)));
});

test('slot metadata is labelled by the section rather than the template', () => {
  const meta = metaForSectionKey(showcaseSlotKey(ID_A), {
    showcases: [
      { id: ID_A, title: 'Autumn campaign', template: 'split_media', isActive: true },
    ],
  });
  assert.equal(meta?.label, 'Autumn campaign');
  assert.equal(meta?.supportsHeader, false);
  assert.equal(meta?.showcase?.template, 'split_media');
});

/* ── Template persistence ───────────────────────────────────────────────── */

test('an update that omits the template keeps the stored one', () => {
  assert.equal(
    resolveShowcaseTemplate(undefined, 'split_media'),
    'split_media',
  );
  assert.equal(
    resolveShowcaseTemplate('', 'split_media'),
    'split_media',
  );
  // An explicit value still wins.
  assert.equal(
    resolveShowcaseTemplate('product_showcase', 'split_media'),
    'product_showcase',
  );
});

test('hyphenated spellings resolve to the stored enum values', () => {
  assert.equal(resolveShowcaseTemplate('split-media', null), 'split_media');
  assert.equal(resolveShowcaseTemplate('product-showcase', null), 'product_showcase');
});

test('a document with no template falls back to whichever panels it has', () => {
  assert.equal(
    resolveShowcaseTemplate(undefined, null, {
      splitLeft: { mediaUrl: 'https://cdn/videos/left.mp4' },
    }),
    'split_media',
  );
  assert.equal(resolveShowcaseTemplate(undefined, null, {}), 'product_showcase');
});

test('a partial update cannot convert a split-media section or drop its panels', () => {
  const value = normalizeShowcaseBody(
    {
      title: 'Autumn campaign',
      splitLeft: { mediaUrl: 'https://cdn/videos/left.mp4' },
      splitRight: { mediaUrl: 'https://cdn/images/right.jpg' },
    },
    { currentTemplate: 'split_media' },
  );

  assert.equal(value.template, 'split_media');
  assert.equal(value.splitLeft?.mediaUrl, 'https://cdn/videos/left.mp4');
  assert.equal(value.splitRight?.mediaUrl, 'https://cdn/images/right.jpg');
});

/* ── Split-panel media ──────────────────────────────────────────────────── */

test('a video URL saved as an image is still played as a video', () => {
  const media = resolveSplitPanelMedia({
    mediaType: 'image',
    mediaUrl: 'https://cdn/videos/campaign.mp4',
  });
  assert.equal(media.mediaType, 'video');
  assert.equal(media.url, 'https://cdn/videos/campaign.mp4');
  // No poster stored, and a video is not its own still.
  assert.equal(media.poster, '');
});

test('an image panel is its own poster', () => {
  const media = resolveSplitPanelMedia({
    mediaType: 'image',
    mediaUrl: 'https://cdn/images/campaign.jpg',
  });
  assert.equal(media.mediaType, 'image');
  assert.equal(media.poster, 'https://cdn/images/campaign.jpg');
});

test('a stored poster wins for a video panel', () => {
  const media = resolveSplitPanelMedia({
    mediaType: 'video',
    mediaUrl: 'https://cdn/videos/campaign.webm',
    posterImage: 'https://cdn/images/poster.jpg',
  });
  assert.equal(media.mediaType, 'video');
  assert.equal(media.poster, 'https://cdn/images/poster.jpg');
});

test('normalising a panel repairs the media type and drops a stale poster', () => {
  const value = normalizeShowcaseBody({
    template: 'split_media',
    title: 'Campaign',
    splitLeft: {
      mediaType: 'image',
      mediaUrl: 'https://cdn/videos/left.mp4',
      posterImage: 'https://cdn/images/poster.jpg',
    },
    splitRight: {
      mediaType: 'video',
      mediaUrl: 'https://cdn/images/right.jpg',
      posterImage: 'https://cdn/images/poster.jpg',
    },
  });

  assert.equal(value.splitLeft?.mediaType, 'video');
  assert.equal(value.splitLeft?.posterImage, 'https://cdn/images/poster.jpg');
  // The right panel is an image, so it needs no poster of its own.
  assert.equal(value.splitRight?.mediaType, 'image');
  assert.equal(value.splitRight?.posterImage, '');
});

test('a split-media payload never carries tabs, and vice versa', () => {
  const split = normalizeShowcaseBody({
    template: 'split_media',
    title: 'Campaign',
    tabs: [{ title: 'Ignored' }],
  });
  assert.deepEqual(split.tabs, []);

  const showcase = normalizeShowcaseBody({
    template: 'product_showcase',
    title: 'New arrivals',
    splitLeft: { mediaUrl: 'https://cdn/images/left.jpg' },
  });
  assert.equal(showcase.splitLeft, undefined);
  assert.equal(showcase.tabs?.length, 1);
});

/* ── Reading a stored section back ──────────────────────────────────────── */

test('a stored split-media section is read back on its own template', () => {
  const section = serializeShowcaseSection({
    _id: ID_A,
    template: 'split_media',
    title: 'Custom Designs',
    cardStyle: 'compact',
    isActive: true,
    order: 2,
    tabs: [],
    splitLeft: {
      mediaType: 'video',
      mediaUrl: 'https://cdn/videos/left.mp4',
      title: 'Everyday Comfort',
      ctaLabel: 'Shop Now',
      ctaLink: '/products',
      productId: ID_B,
    },
    splitRight: {
      mediaType: 'image',
      mediaUrl: 'https://cdn/images/right.png',
      title: 'Designer products',
    },
  });

  assert.equal(section.template, 'split_media');
  assert.equal(section._id, ID_A);
  // Every panel field is present, so the edit form's inputs are controlled
  // from the first render rather than after the first keystroke.
  assert.equal(section.splitLeft?.productId, ID_B);
  assert.equal(section.splitLeft?.kicker, '');
  assert.equal(section.splitRight?.mediaType, 'image');
  assert.equal(section.splitRight?.ctaLabel, '');
});

test('a legacy spelling is read back as the canonical template', () => {
  const section = serializeShowcaseSection({
    _id: ID_A,
    template: 'split-media',
    title: 'Autumn campaign',
    splitLeft: { mediaUrl: 'https://cdn/videos/left.mp4' },
  });
  assert.equal(section.template, 'split_media');
  // And with no template at all, the panels still decide.
  assert.equal(
    serializeShowcaseSection({
      _id: ID_A,
      title: 'Autumn campaign',
      splitRight: { mediaUrl: 'https://cdn/images/right.jpg' },
    }).template,
    'split_media',
  );
});

test('a showcase section keeps its tabs and card style on the way out', () => {
  const section = serializeShowcaseSection({
    _id: ID_B,
    template: 'product_showcase',
    title: 'New Summer 2026',
    cardStyle: 'compact',
    order: 0,
    tabs: [
      {
        id: 'tab-1',
        title: 'New Arrivals',
        value: 'tab_1',
        productSource: 'new-arrivals',
        limit: 8,
      },
    ],
  });

  assert.equal(section.template, 'product_showcase');
  assert.equal(section.cardStyle, 'compact');
  assert.equal(section.tabs?.length, 1);
  // The promo object is filled in even when the stored tab has none.
  assert.equal(section.tabs?.[0].promotion?.kicker, '');
  // Tab ids survive, so the form does not remount every row on each fetch.
  assert.equal(section.tabs?.[0].id, 'tab-1');
});

test('an unreadable card style falls back per template', () => {
  assert.equal(
    serializeShowcaseSection({ _id: ID_A, template: 'split_media' }).cardStyle,
    'compact',
  );
  assert.equal(
    serializeShowcaseSection({ _id: ID_A, template: 'product_showcase' }).cardStyle,
    'showcase',
  );
});

test('a split-media edit round-trips through normalize and back', () => {
  const stored = {
    _id: ID_A,
    template: 'split_media',
    title: 'Custom Designs',
    cardStyle: 'compact',
    isActive: true,
    order: 3,
    tabs: [],
    splitLeft: {
      mediaType: 'video',
      mediaUrl: 'https://cdn/videos/left.mp4',
      posterImage: 'https://cdn/images/poster.jpg',
      kicker: 'Autumn',
      title: 'Everyday Comfort',
      ctaLabel: 'Shop Now',
      ctaLink: '/products',
      productId: ID_B,
    },
    splitRight: {
      mediaType: 'image',
      mediaUrl: 'https://cdn/images/right.png',
      title: 'Designer products',
      ctaLabel: 'Buy Now',
      ctaLink: '/products',
      productId: ID_A,
    },
  };

  // What the form loads, submits unchanged, and the route normalizes.
  const loaded = serializeShowcaseSection(stored);
  const saved = normalizeShowcaseBody(
    loaded as unknown as Record<string, unknown>,
    { currentTemplate: loaded.template },
  );
  const reloaded = serializeShowcaseSection({ ...stored, ...saved });

  assert.equal(reloaded.template, 'split_media');
  assert.deepEqual(reloaded.splitLeft, loaded.splitLeft);
  assert.deepEqual(reloaded.splitRight, loaded.splitRight);
  assert.equal(reloaded.title, 'Custom Designs');
  assert.equal(reloaded.order, 3);
});

/* ── Template switching in the form ─────────────────────────────────────── */

test('panel content is detected from any field an admin filled in', () => {
  assert.ok(splitPanelHasContent({ mediaUrl: 'https://cdn/images/a.jpg' }));
  assert.ok(splitPanelHasContent({ kicker: 'Autumn' }));
  assert.ok(splitPanelHasContent({ productId: ID_A }));
  assert.ok(!splitPanelHasContent({ mediaType: 'image', mediaUrl: '' }));
  assert.ok(!splitPanelHasContent(undefined));
});

test('template options and badges are i18n keys, not copy', () => {
  for (const option of [...TEMPLATE_OPTIONS, ...CARD_STYLE_OPTIONS]) {
    assert.match(option.labelKey, /^admin\.showcase\./);
    assert.match(option.descriptionKey, /^admin\.showcase\./);
  }
  assert.equal(
    templateLabelKey('split_media'),
    'admin.showcase.templateBadge.splitMedia',
  );
  assert.equal(
    templateLabelKey('product_showcase'),
    'admin.showcase.templateBadge.productShowcase',
  );
});

/* ── Media framing ──────────────────────────────────────────────────────── */

test('a ratio is only reported when it can be measured', () => {
  assert.equal(mediaRatio(1920, 1080), 1920 / 1080);
  assert.equal(mediaRatio(0, 1080), null);
  assert.equal(mediaRatio(1080, 0), null);
  assert.equal(mediaRatio(undefined, undefined), null);
  assert.equal(mediaRatio(Number.NaN, 100), null);
});

test('an unmeasured asset is centred rather than guessed at', () => {
  const framing = resolveMediaFraming(null);
  assert.equal(framing.orientation, 'landscape');
  assert.equal(framing.objectPosition, '50% 50%');
  assert.equal(resolveMediaFraming(0).objectPosition, '50% 50%');
});

test('orientation follows the asset\'s own shape', () => {
  assert.equal(resolveMediaFraming(1920 / 1080).orientation, 'landscape');
  assert.equal(resolveMediaFraming(1).orientation, 'square');
  assert.equal(resolveMediaFraming(1080 / 1440).orientation, 'portrait');
  assert.equal(resolveMediaFraming(1080 / 1920).orientation, 'tall');
});

test('the taller the asset, the higher the crop is anchored', () => {
  // A landscape panel has to crop a vertical clip; anchoring high is what keeps
  // the subject — faces sit in the upper half of phone-shot footage.
  const anchorY = (ratio: number) =>
    Number(resolveMediaFraming(ratio).objectPosition.split(' ')[1].replace('%', ''));

  const landscape = anchorY(16 / 9);
  const square = anchorY(1);
  const portrait = anchorY(3 / 4);
  const tall = anchorY(9 / 16);

  assert.equal(landscape, 50);
  assert.ok(square < landscape, 'a square asset sits above centre');
  assert.ok(portrait < square, 'a portrait asset sits above a square one');
  assert.ok(tall < portrait, 'a vertical clip sits highest');
  // Never so high that the subject is pushed out of the top of the frame.
  assert.ok(tall >= 15);
  // The horizontal anchor stays centred at every shape.
  for (const ratio of [16 / 9, 1, 3 / 4, 9 / 16]) {
    assert.match(resolveMediaFraming(ratio).objectPosition, /^50% /);
  }
});
