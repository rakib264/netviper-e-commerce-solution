/**
 * Homepage section registry.
 *
 * These are the *render slots* on the homepage — one per component that
 * `HomeClient` can mount. They are deliberately separate from
 * `LANDING_SECTION_KEYS` in `./defaults`, which models editable *content blocks*
 * (hero slides, promo banners, footer links). A slot decides whether and where a
 * component renders; a content block is data that a component displays.
 *
 * Adding a section is a single entry in `HOMEPAGE_SECTION_META` plus a mapping in
 * `components/home/section-registry.tsx`. Adding a per-section option is a single
 * entry in that section's `configFields` — the admin form, validation and
 * persistence all derive from it.
 */

export const HOMEPAGE_SECTION_KEYS = [
  'heroCarousel',
  'activeDeals',
  'categories',
  'productListing',
  'horizontalAdvertisements',
  'landingEvents',
  'comboBundles',
  'featuredProducts',
  'verticalAdvertisements',
  'socialProof',
  'newsletter',
] as const;

/** A slot that exists once, declared in this file. */
export type StaticHomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

/* ── Dynamic slots ──────────────────────────────────────────────────────── */

/**
 * Two slot families have a variable number of members: an admin can create as
 * many product showcases and curated product sections as they like, and each
 * needs its own place in the page order. Those get a *dynamic* key —
 * `<family>:<document id>` — rather than one aggregate slot rendering the whole
 * family back to back at a single fixed position.
 *
 * `syncDynamicSectionSlots` in `./homepage-sections-server` keeps exactly one
 * slot document per source record and retires slots whose record is gone.
 */
export const SHOWCASE_SLOT_PREFIX = 'productShowcase:';
export const CURATED_SLOT_PREFIX = 'curatedSection:';

export type ShowcaseSlotKey = `${typeof SHOWCASE_SLOT_PREFIX}${string}`;
export type CuratedSlotKey = `${typeof CURATED_SLOT_PREFIX}${string}`;
export type DynamicSlotKey = ShowcaseSlotKey | CuratedSlotKey;

/** The aggregate slot that dynamic showcase slots replaced. */
export const LEGACY_SHOWCASE_SECTION_KEY = 'productShowcase';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const matchesPrefix = (value: unknown, prefix: string): boolean =>
  typeof value === 'string' &&
  value.startsWith(prefix) &&
  OBJECT_ID_PATTERN.test(value.slice(prefix.length));

const idAfterPrefix = (value: unknown, prefix: string): string | null =>
  matchesPrefix(value, prefix) ? (value as string).slice(prefix.length) : null;

export const showcaseSlotKey = (id: string): ShowcaseSlotKey =>
  `${SHOWCASE_SLOT_PREFIX}${id}`;

export const curatedSlotKey = (id: string): CuratedSlotKey =>
  `${CURATED_SLOT_PREFIX}${id}`;

export function isShowcaseSlotKey(value: unknown): value is ShowcaseSlotKey {
  return matchesPrefix(value, SHOWCASE_SLOT_PREFIX);
}

export function isCuratedSlotKey(value: unknown): value is CuratedSlotKey {
  return matchesPrefix(value, CURATED_SLOT_PREFIX);
}

export function isDynamicSlotKey(value: unknown): value is DynamicSlotKey {
  return isShowcaseSlotKey(value) || isCuratedSlotKey(value);
}

/** The showcase section id behind a slot key, or `null` for any other key. */
export function parseShowcaseSlotKey(value: unknown): string | null {
  return idAfterPrefix(value, SHOWCASE_SLOT_PREFIX);
}

/** The curated section id behind a slot key, or `null` for any other key. */
export function parseCuratedSlotKey(value: unknown): string | null {
  return idAfterPrefix(value, CURATED_SLOT_PREFIX);
}

export type HomepageSectionKey = StaticHomepageSectionKey | DynamicSlotKey;

export const HOMEPAGE_SECTION_KEY_SET: ReadonlySet<string> = new Set(
  HOMEPAGE_SECTION_KEYS,
);

export const isHomepageSectionKey = (value: unknown): value is HomepageSectionKey =>
  (typeof value === 'string' && HOMEPAGE_SECTION_KEY_SET.has(value)) ||
  isDynamicSlotKey(value);

/* ── Per-section configuration schema ───────────────────────────────────── */

export type ConfigFieldType = 'text' | 'number' | 'boolean' | 'select';

export interface ConfigFieldOption {
  value: string;
  label: string;
}

/**
 * Declarative descriptor for one entry in a section's `settings` object. The
 * admin dialog renders from this and the API validates against it, so a new
 * option never needs a form change or a bespoke validator.
 */
export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  help?: string;
  defaultValue: string | number | boolean;
  /** `number` only. */
  min?: number;
  max?: number;
  /** `select` only. */
  options?: ConfigFieldOption[];
}

export interface HomepageSectionMeta {
  key: HomepageSectionKey;
  label: string;
  description: string;
  /** False for sections that render no heading of their own (e.g. the hero). */
  supportsHeader: boolean;
  /** Deep-customisation route for sections that already have a dedicated screen. */
  manageHref?: string;
  configFields: ConfigField[];
  defaults: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  /** Present only on product-showcase slots. Drives the badges in the admin list. */
  showcase?: ShowcaseSlotDescriptor;
  /** Present only on curated-section slots. Drives the badges in the admin list. */
  curated?: CuratedSlotDescriptor;
}

const LIMIT_FIELD = (defaultValue: number, max = 24): ConfigField => ({
  key: 'limit',
  label: 'Items to show',
  type: 'number',
  help: 'How many products or cards this section renders.',
  defaultValue,
  min: 1,
  max,
});

const CTA_FIELDS: ConfigField[] = [
  {
    key: 'ctaText',
    label: 'Call-to-action label',
    type: 'text',
    help: 'Leave blank to hide the section link.',
    defaultValue: '',
  },
  {
    key: 'ctaLink',
    label: 'Call-to-action link',
    type: 'text',
    help: 'Relative path, e.g. /products.',
    defaultValue: '',
  },
];

const CONTAINER_FIELD: ConfigField = {
  key: 'fullWidth',
  label: 'Full-bleed width',
  type: 'boolean',
  help: 'Break out of the centred container for edge-to-edge media.',
  defaultValue: false,
};

/**
 * Shared controls for both advertisement bands. They render through one
 * component, so their options stay identical — only the card proportion differs.
 */
const ADVERTISEMENT_FIELDS: ConfigField[] = [
  {
    key: 'layout',
    label: 'Layout',
    type: 'select',
    help: 'One edge-to-edge card, or up to three in equal-width columns.',
    defaultValue: 'multi',
    options: [
      { value: 'full-width', label: 'Full width — a single ad' },
      { value: 'multi', label: 'Multi — up to 3 equal columns' },
    ],
  },
  {
    key: 'limit',
    label: 'Ads to show',
    type: 'number',
    help: 'Ignored in full-width layout, which always shows one.',
    defaultValue: 3,
    min: 1,
    max: 3,
  },
  CONTAINER_FIELD,
  {
    key: 'autoplayVideo',
    label: 'Autoplay video ads',
    type: 'boolean',
    help: 'Muted and lazy-loaded. Visitors who prefer reduced motion see the poster.',
    defaultValue: true,
  },
];

export const HOMEPAGE_SECTION_META: HomepageSectionMeta[] = [
  {
    key: 'heroCarousel',
    label: 'Hero carousel',
    description:
      'Full-bleed campaign slides with floating product cards. Slides are managed on their own screen.',
    supportsHeader: false,
    manageHref: '/admin/landing-management/hero-carousel',
    configFields: [
      {
        key: 'autoplay',
        label: 'Autoplay slides',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'autoplayDelay',
        label: 'Autoplay delay (ms)',
        type: 'number',
        defaultValue: 6000,
        min: 1500,
        max: 20000,
      },
    ],
    defaults: { eyebrow: '', title: '', subtitle: '' },
  },
  {
    key: 'activeDeals',
    label: 'Active deals',
    description:
      'The cart rewards that are running right now — spend thresholds, free gifts, points and punch cards.',
    supportsHeader: true,
    manageHref: '/admin/marketing',
    configFields: [
      CONTAINER_FIELD,
      {
        key: 'autoplay',
        label: 'Advance slides automatically',
        type: 'boolean',
        help: 'Pauses on hover and is ignored when the visitor prefers reduced motion.',
        defaultValue: true,
      },
    ],
    defaults: {
      eyebrow: 'Rewards',
      title: 'Deals running now',
      subtitle: 'Add to your bag and these unlock automatically at checkout.',
    },
  },
  {
    key: 'categories',
    label: 'Category grid',
    description: 'Shop-by-category tiles pulled from the active category tree.',
    supportsHeader: true,
    configFields: [LIMIT_FIELD(6, 12), ...CTA_FIELDS],
    defaults: {
      eyebrow: 'Shop by Category',
      title: 'For Every Journey',
      subtitle: '',
    },
  },
  {
    key: 'productListing',
    label: 'Product listing',
    description:
      'The main homepage product grid — new arrivals by default, switchable via settings.',
    supportsHeader: true,
    configFields: [
      {
        key: 'source',
        label: 'Product source',
        type: 'select',
        defaultValue: 'new-arrivals',
        options: [
          { value: 'latest', label: 'Latest products' },
          { value: 'featured', label: 'Featured products' },
          { value: 'new-arrivals', label: 'New arrivals' },
          { value: 'best-selling', label: 'Best selling' },
          { value: 'limited-edition', label: 'Limited edition' },
        ],
      },
      LIMIT_FIELD(8),
      ...CTA_FIELDS,
    ],
    defaults: { eyebrow: 'Collection', title: 'New Arrivals', subtitle: '' },
  },
  {
    key: 'horizontalAdvertisements',
    label: 'Horizontal advertisements',
    description:
      'Wide promotional cards with Bunny-hosted image or video backgrounds. Managed under Marketing & Deals.',
    supportsHeader: true,
    manageHref: '/admin/marketing?tab=advertisement',
    configFields: ADVERTISEMENT_FIELDS,
    defaults: { eyebrow: '', title: '', subtitle: '' },
  },
  {
    key: 'landingEvents',
    label: 'Events & deals',
    description: 'Time-boxed campaigns and discount events.',
    supportsHeader: true,
    manageHref: '/admin/marketing?tab=quick-deals',
    configFields: [LIMIT_FIELD(4, 12), ...CTA_FIELDS],
    defaults: {
      eyebrow: 'Limited time',
      title: 'Special Events & Deals',
      subtitle: '',
    },
  },
  {
    key: 'comboBundles',
    label: 'Combos & bundles',
    description:
      'Fixed-price offers made of two or more products, sold as one unit.',
    supportsHeader: true,
    manageHref: '/admin/marketing?tab=combos',
    configFields: [
      LIMIT_FIELD(8, 24),
      {
        key: 'featuredOnly',
        label: 'Featured offers only',
        type: 'boolean',
        help: 'Show only the offers flagged as featured in the combos manager.',
        defaultValue: false,
      },
      ...CTA_FIELDS,
    ],
    defaults: {
      eyebrow: 'Bundled',
      title: 'Combos & Bundles',
      subtitle: '',
    },
  },
  {
    key: 'featuredProducts',
    label: 'Featured products',
    description: 'Products flagged as featured in the catalogue.',
    supportsHeader: true,
    configFields: [LIMIT_FIELD(8), ...CTA_FIELDS],
    defaults: { eyebrow: 'Selected', title: 'Featured Products', subtitle: '' },
  },
  {
    key: 'verticalAdvertisements',
    label: 'Vertical advertisements',
    description:
      'Tall promotional panels sharing the horizontal band\u2019s media and layout model. Managed under Marketing & Deals.',
    supportsHeader: true,
    manageHref: '/admin/marketing?tab=advertisement',
    configFields: ADVERTISEMENT_FIELDS,
    defaults: { eyebrow: '', title: '', subtitle: '' },
  },
  {
    key: 'socialProof',
    label: 'Social proof',
    description: 'Customer reviews, ratings and trust signals.',
    supportsHeader: true,
    configFields: [
      LIMIT_FIELD(3, 12),
      {
        key: 'minRating',
        label: 'Minimum rating to display',
        type: 'number',
        defaultValue: 4,
        min: 1,
        max: 5,
      },
    ],
    defaults: {
      eyebrow: 'Loved by our customers',
      title: 'Customer Reviews',
      subtitle: '',
    },
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    description: 'Email capture block with configurable copy.',
    supportsHeader: true,
    configFields: [
      {
        key: 'placeholder',
        label: 'Input placeholder',
        type: 'text',
        defaultValue: 'Enter your email',
      },
      {
        key: 'buttonText',
        label: 'Button label',
        type: 'text',
        defaultValue: 'Subscribe',
      },
      {
        key: 'disclaimer',
        label: 'Disclaimer',
        type: 'text',
        defaultValue: '',
      },
    ],
    defaults: {
      eyebrow: 'Newsletter',
      title: 'Stay in the loop',
      subtitle: 'New arrivals, private sales and studio notes.',
    },
  },
];

export const HOMEPAGE_SECTION_META_BY_KEY: Record<
  HomepageSectionKey,
  HomepageSectionMeta
> = HOMEPAGE_SECTION_META.reduce(
  (accumulator, meta) => {
    accumulator[meta.key] = meta;
    return accumulator;
  },
  {} as Record<HomepageSectionKey, HomepageSectionMeta>,
);

export const SHOWCASE_MANAGE_HREF = '/admin/landing-management/product-showcase';

/** What the admin list needs to describe one showcase slot. */
export interface ShowcaseSlotDescriptor {
  id: string;
  title: string;
  template: 'product_showcase' | 'split_media';
  /** The showcase's own live flag, which gates rendering alongside `isEnabled`. */
  isActive: boolean;
}

/**
 * Registry metadata for a dynamic showcase slot.
 *
 * The label is the section's own title rather than a fixed string: several
 * showcase rows sit in the same list, and "Product showcase" repeated four
 * times tells an admin nothing about which one they are dragging.
 */
export function showcaseSlotMeta(
  descriptor: ShowcaseSlotDescriptor,
): HomepageSectionMeta {
  const kind =
    descriptor.template === 'split_media' ? 'Split media' : 'Product showcase';
  return {
    key: showcaseSlotKey(descriptor.id),
    label: descriptor.title || kind,
    description: descriptor.isActive
      ? `${kind} section. Content and card style are managed on the showcase screen.`
      : `${kind} section — switched off on the showcase screen, so it stays hidden.`,
    // Heading copy belongs to the showcase record, not to the slot.
    supportsHeader: false,
    manageHref: SHOWCASE_MANAGE_HREF,
    configFields: [],
    defaults: { eyebrow: '', title: '', subtitle: '' },
    showcase: descriptor,
  };
}

export const CURATED_MANAGE_HREF = '/admin/landing-management/curated-sections';

/** What the admin list needs to describe one curated-section slot. */
export interface CuratedSlotDescriptor {
  id: string;
  /** Admin-facing name of the curated section. */
  label: string;
  /** `manual` | `auto` | `hybrid`, kept loose so the registry stays dependency-free. */
  sourceMode: string;
  /** The section's own live flag, which gates rendering alongside `isEnabled`. */
  isActive: boolean;
}

/**
 * Registry metadata for a dynamic curated slot.
 *
 * As with showcase slots, the label is the section's own name: a homepage can
 * carry several curated bands, and "Curated products" four times over tells an
 * admin nothing about which row they are dragging.
 */
export function curatedSlotMeta(
  descriptor: CuratedSlotDescriptor,
): HomepageSectionMeta {
  return {
    key: curatedSlotKey(descriptor.id),
    label: descriptor.label || 'Curated products',
    description: descriptor.isActive
      ? 'Curated product section. Copy, products and layout are managed on the curated sections screen.'
      : 'Curated product section — switched off on the curated sections screen, so it stays hidden.',
    // Copy belongs to the curated record, not to the slot.
    supportsHeader: false,
    manageHref: CURATED_MANAGE_HREF,
    configFields: [],
    defaults: { eyebrow: '', title: '', subtitle: '' },
    curated: descriptor,
  };
}

/** Source records the dynamic slots describe, for metadata lookup. */
export interface SlotDescriptorContext {
  showcases?: ReadonlyArray<ShowcaseSlotDescriptor>;
  curated?: ReadonlyArray<CuratedSlotDescriptor>;
}

/** Registry metadata for any key, static or dynamic. */
export function metaForSectionKey(
  key: HomepageSectionKey,
  context?: SlotDescriptorContext,
): HomepageSectionMeta | undefined {
  const showcaseId = parseShowcaseSlotKey(key);
  if (showcaseId) {
    const descriptor = context?.showcases?.find((item) => item.id === showcaseId);
    return showcaseSlotMeta(
      descriptor ?? {
        id: showcaseId,
        title: '',
        template: 'product_showcase',
        isActive: true,
      },
    );
  }

  const curatedId = parseCuratedSlotKey(key);
  if (curatedId) {
    const descriptor = context?.curated?.find((item) => item.id === curatedId);
    return curatedSlotMeta(
      descriptor ?? {
        id: curatedId,
        label: '',
        sourceMode: 'auto',
        isActive: true,
      },
    );
  }

  return HOMEPAGE_SECTION_META_BY_KEY[key as StaticHomepageSectionKey];
}

/* ── Config shape ───────────────────────────────────────────────────────── */

export type HomepageSectionSettings = Record<string, string | number | boolean>;

/**
 * Typed reads out of an untyped `settings` bag.
 *
 * They live here rather than next to the components because the server data
 * layer needs them too — it reads each section's configured `limit` to decide
 * how much to query, so the same coercion has to be available without pulling a
 * client module into a server import graph.
 */
export function settingsNumber(
  settings: HomepageSectionSettings | undefined,
  key: string,
  fallback: number,
): number {
  const value = settings?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function settingsString(
  settings: HomepageSectionSettings | undefined,
  key: string,
  fallback = '',
): string {
  const value = settings?.[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function settingsBoolean(
  settings: HomepageSectionSettings | undefined,
  key: string,
  fallback = false,
): boolean {
  const value = settings?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

export interface HomepageSectionConfig {
  key: HomepageSectionKey;
  eyebrow: string;
  title: string;
  subtitle: string;
  isEnabled: boolean;
  sortOrder: number;
  settings: HomepageSectionSettings;
}

/** The editable surface of a section, used by the admin PATCH endpoint. */
export type HomepageSectionUpdate = Partial<
  Pick<HomepageSectionConfig, 'eyebrow' | 'title' | 'subtitle' | 'isEnabled' | 'settings'>
>;

export function defaultSettingsFor(key: HomepageSectionKey): HomepageSectionSettings {
  const meta = metaForSectionKey(key);
  if (!meta) return {};
  return meta.configFields.reduce((accumulator, field) => {
    accumulator[field.key] = field.defaultValue;
    return accumulator;
  }, {} as HomepageSectionSettings);
}

export function createDefaultHomepageSection(
  key: HomepageSectionKey,
  index: number,
): HomepageSectionConfig {
  const meta = metaForSectionKey(key);
  return {
    key,
    eyebrow: meta?.defaults.eyebrow ?? '',
    title: meta?.defaults.title ?? '',
    subtitle: meta?.defaults.subtitle ?? '',
    // The newsletter stays dark until an admin has copy for it. A showcase slot
    // only exists because a showcase section exists, so it starts live and lets
    // that section's own `isActive` flag decide.
    isEnabled: key !== 'newsletter',
    sortOrder: index + 1,
    settings: defaultSettingsFor(key),
  };
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] =
  HOMEPAGE_SECTION_KEYS.map((key, index) => createDefaultHomepageSection(key, index));

/* ── Normalisation ──────────────────────────────────────────────────────── */

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Coerce an untrusted `settings` object against the section's declared fields.
 * Unknown keys are dropped rather than persisted, so the stored document cannot
 * drift away from the registry.
 */
export function normalizeSettings(
  key: HomepageSectionKey,
  input: unknown,
): { settings: HomepageSectionSettings; errors: string[] } {
  const meta = metaForSectionKey(key);
  const errors: string[] = [];
  const settings = defaultSettingsFor(key);

  if (!meta || !input || typeof input !== 'object') {
    return { settings, errors };
  }

  const raw = input as Record<string, unknown>;

  for (const field of meta.configFields) {
    const value = raw[field.key];
    if (typeof value === 'undefined' || value === null) continue;

    switch (field.type) {
      case 'text':
        settings[field.key] =
          typeof value === 'string' ? value.trim().slice(0, 300) : String(value);
        break;
      case 'boolean':
        settings[field.key] = Boolean(value);
        break;
      case 'number': {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          errors.push(`"${field.label}" must be a number.`);
          break;
        }
        settings[field.key] = clampNumber(
          Math.round(numeric),
          field.min ?? 0,
          field.max ?? Number.MAX_SAFE_INTEGER,
        );
        break;
      }
      case 'select': {
        const allowed = (field.options || []).map((option) => option.value);
        if (typeof value !== 'string' || !allowed.includes(value)) {
          errors.push(`"${field.label}" must be one of: ${allowed.join(', ')}.`);
          break;
        }
        settings[field.key] = value;
        break;
      }
    }
  }

  for (const providedKey of Object.keys(raw)) {
    if (!meta.configFields.some((field) => field.key === providedKey)) {
      errors.push(`Unknown setting "${providedKey}" for ${meta.label}.`);
    }
  }

  return { settings, errors };
}

const TEXT_LIMITS = { eyebrow: 80, title: 160, subtitle: 300 } as const;

export function normalizeHomepageSectionUpdate(
  key: HomepageSectionKey,
  input: unknown,
): { update: HomepageSectionUpdate; errors: string[] } {
  const update: HomepageSectionUpdate = {};
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { update, errors: ['A JSON body is required.'] };
  }

  const raw = input as Record<string, unknown>;

  for (const field of ['eyebrow', 'title', 'subtitle'] as const) {
    if (typeof raw[field] === 'undefined') continue;
    if (typeof raw[field] !== 'string') {
      errors.push(`"${field}" must be a string.`);
      continue;
    }
    update[field] = (raw[field] as string).trim().slice(0, TEXT_LIMITS[field]);
  }

  if (typeof raw.isEnabled !== 'undefined') {
    if (typeof raw.isEnabled !== 'boolean') {
      errors.push('"isEnabled" must be a boolean.');
    } else {
      update.isEnabled = raw.isEnabled;
    }
  }

  if (typeof raw.settings !== 'undefined') {
    const normalized = normalizeSettings(key, raw.settings);
    errors.push(...normalized.errors);
    update.settings = normalized.settings;
  }

  return { update, errors };
}

/**
 * Merge stored documents over the shipped defaults. Any section missing from the
 * database still renders, and any stored key no longer in the registry is
 * ignored — so removing a section from the code cannot break the homepage.
 */
export function mergeHomepageSections(
  stored?: Array<Partial<HomepageSectionConfig>> | null,
): HomepageSectionConfig[] {
  const storedByKey = new Map<string, Partial<HomepageSectionConfig>>();
  for (const section of stored || []) {
    if (section?.key && isHomepageSectionKey(section.key)) {
      storedByKey.set(section.key, section);
    }
  }

  // Static slots always render; dynamic slots exist only for the records that
  // have one, so they are discovered from the stored documents rather than from
  // a fixed list. A slot whose record has since been deleted still merges
  // here — the renderer drops it, and the server sync removes the document.
  const dynamicKeys = [...storedByKey.keys()].filter(isDynamicSlotKey);
  const keys: HomepageSectionKey[] = [...HOMEPAGE_SECTION_KEYS, ...dynamicKeys];

  return keys.map((key, index) => {
    const fallback = createDefaultHomepageSection(key, index);
    const match = storedByKey.get(key);
    if (!match) return fallback;

    return {
      key,
      eyebrow: match.eyebrow ?? fallback.eyebrow,
      title: match.title ?? fallback.title,
      subtitle: match.subtitle ?? fallback.subtitle,
      isEnabled:
        typeof match.isEnabled === 'boolean' ? match.isEnabled : fallback.isEnabled,
      sortOrder:
        typeof match.sortOrder === 'number' && Number.isFinite(match.sortOrder)
          ? match.sortOrder
          : fallback.sortOrder,
      // Defaults fill in any field added to the registry since this document was
      // written, so new options appear without a migration.
      settings: { ...fallback.settings, ...normalizeSettings(key, match.settings).settings },
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
}

export function resolveSectionHeader(
  section: Pick<HomepageSectionConfig, 'key' | 'eyebrow' | 'title' | 'subtitle'>,
): { eyebrow: string; title: string; subtitle: string } {
  const meta = metaForSectionKey(section.key);
  return {
    eyebrow: section.eyebrow || meta?.defaults.eyebrow || '',
    title: section.title || meta?.defaults.title || '',
    subtitle: section.subtitle || meta?.defaults.subtitle || '',
  };
}
