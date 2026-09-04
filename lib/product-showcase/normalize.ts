import {
  emptyTab,
  resolvePanelMediaType,
  resolveShowcaseTemplate,
  type ShowcaseCardStyle,
  type ShowcaseSection,
  type ShowcaseProductSource,
  type ShowcasePromo,
  type ShowcaseSectionInput,
  type ShowcaseTab,
  type ShowcaseTemplate,
  type SplitPanel,
} from '@/lib/product-showcase/types';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

function normalizePromo(raw: unknown): ShowcasePromo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Record<string, unknown>;
  return {
    image: String(p.image || '').trim(),
    video: String(p.video || '').trim(),
    kicker: String(p.kicker || '').trim(),
    title: String(p.title || '').trim(),
    subtitle: String(p.subtitle || '').trim(),
    ctaLabel: String(p.ctaLabel || '').trim(),
    ctaLink: String(p.ctaLink || '').trim(),
  };
}

function normalizePanel(raw: unknown): SplitPanel | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Record<string, unknown>;
  const mediaUrl = String(p.mediaUrl || '').trim();
  // The URL is authoritative where it is conclusive: a video pasted into the
  // URL field arrives with `mediaType: 'image'` and would be stored as one.
  const mediaType = resolvePanelMediaType(
    mediaUrl,
    p.mediaType === 'video' ? 'video' : 'image'
  );
  const posterImage = String(p.posterImage || '').trim();

  return {
    mediaType,
    mediaUrl,
    // An image panel is its own poster; keeping the field empty avoids storing
    // the same URL twice and lets the renderer decide.
    posterImage: mediaType === 'video' ? posterImage : '',
    title: String(p.title || '').trim(),
    kicker: String(p.kicker || '').trim(),
    ctaLabel: String(p.ctaLabel || '').trim(),
    ctaLink: String(p.ctaLink || '').trim(),
    productId: String(p.productId || '').trim(),
  };
}

const EMPTY_PROMO: ShowcasePromo = {
  image: '',
  video: '',
  kicker: '',
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaLink: '',
};

const EMPTY_PANEL: SplitPanel = {
  mediaType: 'image',
  mediaUrl: '',
  posterImage: '',
  title: '',
  kicker: '',
  ctaLabel: '',
  ctaLink: '',
  productId: '',
};

function normalizeTabs(raw: unknown): ShowcaseTab[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyTab(0)];
  return raw.slice(0, 6).map((item, index) => {
    const t = (item || {}) as Record<string, unknown>;
    const title = String(t.title || `Collection ${index + 1}`).trim();
    const value =
      String(t.value || '').trim() || slugify(title) || `tab_${index + 1}`;
    const source = String(t.productSource || 'latest') as ShowcaseProductSource;
    const allowed: ShowcaseProductSource[] = [
      'manual',
      'latest',
      'featured',
      'new-arrivals',
      'best-selling',
      'category',
    ];
    return {
      id: String(t.id || `tab-${index}-${Date.now()}`),
      title,
      value,
      promotion: normalizePromo(t.promotion),
      productSource: allowed.includes(source) ? source : 'latest',
      categorySlug: String(t.categorySlug || '').trim(),
      productIds: Array.isArray(t.productIds)
        ? t.productIds.map((id) => String(id)).filter(Boolean).slice(0, 24)
        : [],
      limit: Math.max(1, Math.min(24, Number(t.limit ?? 8) || 8)),
    };
  });
}

export interface NormalizeShowcaseOptions {
  /**
   * The template already stored for this section. An update that does not name
   * a template keeps this one — without it, any partial write silently converts
   * a split-media section into a product showcase and drops both panels.
   */
  currentTemplate?: ShowcaseTemplate | null;
}

export function normalizeShowcaseBody(
  body: Record<string, unknown>,
  { currentTemplate }: NormalizeShowcaseOptions = {}
): ShowcaseSectionInput {
  const template: ShowcaseTemplate = resolveShowcaseTemplate(
    body.template,
    currentTemplate,
    { splitLeft: body.splitLeft, splitRight: body.splitRight }
  );

  const cardStyleRaw = String(body.cardStyle || 'showcase') as ShowcaseCardStyle;
  const cardStyle: ShowcaseCardStyle = ['showcase', 'luxury', 'compact'].includes(
    cardStyleRaw
  )
    ? cardStyleRaw
    : template === 'split_media'
      ? 'compact'
      : 'showcase';

  const base: ShowcaseSectionInput = {
    template,
    title: String(body.title || '').trim() || 'Untitled section',
    subtitle: String(body.subtitle || '').trim(),
    cardStyle,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    order: body.order !== undefined ? Number(body.order) : 0,
  };

  if (template === 'split_media') {
    return {
      ...base,
      cardStyle: cardStyle === 'showcase' ? 'compact' : cardStyle,
      tabs: [],
      splitLeft: normalizePanel(body.splitLeft) || { ...EMPTY_PANEL },
      splitRight: normalizePanel(body.splitRight) || { ...EMPTY_PANEL },
    };
  }

  return {
    ...base,
    tabs: normalizeTabs(body.tabs),
    splitLeft: undefined,
    splitRight: undefined,
  };
}

/* ── Read side ──────────────────────────────────────────────────────────── */

function readCardStyle(
  raw: unknown,
  template: ShowcaseTemplate
): ShowcaseCardStyle {
  const value = String(raw || '') as ShowcaseCardStyle;
  if (['showcase', 'luxury', 'compact'].includes(value)) return value;
  return template === 'split_media' ? 'compact' : 'showcase';
}

/** Stored tabs, with the promo object filled in so form inputs stay controlled. */
function readTabs(raw: unknown): ShowcaseTab[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const t = (item || {}) as Record<string, unknown>;
    return {
      id: String(t.id || `tab-${index}`),
      title: String(t.title || ''),
      value: String(t.value || `tab_${index + 1}`),
      promotion: normalizePromo(t.promotion) || { ...EMPTY_PROMO },
      productSource: String(t.productSource || 'latest') as ShowcaseProductSource,
      categorySlug: String(t.categorySlug || ''),
      productIds: Array.isArray(t.productIds)
        ? t.productIds.map((id) => String(id)).filter(Boolean)
        : [],
      limit: Number(t.limit ?? 8) || 8,
    };
  });
}

const asIso = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

/**
 * Turn a stored document into the section shape the admin and storefront read.
 *
 * The template is resolved here rather than compared inline by every caller:
 * documents written before the field was populated — or by an import that used
 * the hyphenated spelling — otherwise fall through every `=== 'split_media'`
 * check and are rendered, badged and edited as product showcases. Both
 * templates' fields are passed through whatever the resolved template is, so
 * switching a section's template in the admin never strands the other side.
 */
export function serializeShowcaseSection(
  doc: Record<string, unknown>
): ShowcaseSection {
  const raw = doc as Record<string, any>;
  const template = resolveShowcaseTemplate(raw.template, null, {
    splitLeft: raw.splitLeft,
    splitRight: raw.splitRight,
  });

  return {
    _id: String(raw._id ?? ''),
    template,
    title: String(raw.title || ''),
    subtitle: String(raw.subtitle || ''),
    cardStyle: readCardStyle(raw.cardStyle, template),
    isActive: raw.isActive !== false,
    order: Number(raw.order ?? 0) || 0,
    tabs: readTabs(raw.tabs),
    splitLeft: normalizePanel(raw.splitLeft),
    splitRight: normalizePanel(raw.splitRight),
    createdAt: asIso(raw.createdAt),
    updatedAt: asIso(raw.updatedAt),
  };
}
