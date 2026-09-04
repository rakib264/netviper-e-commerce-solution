/** Shared product-showcase section model — admin & storefront */

export type ShowcaseTemplate = 'product_showcase' | 'split_media';

export type ShowcaseCardStyle = 'showcase' | 'luxury' | 'compact';

export type ShowcaseProductSource =
  | 'manual'
  | 'latest'
  | 'featured'
  | 'new-arrivals'
  | 'best-selling'
  | 'category';

export interface ShowcasePromo {
  image?: string;
  video?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface ShowcaseTab {
  id: string;
  title: string;
  value: string;
  promotion?: ShowcasePromo;
  productSource: ShowcaseProductSource;
  categorySlug?: string;
  productIds?: string[];
  limit?: number;
}

export interface SplitPanel {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  /** Still frame for a video panel: the poster, and the fallback if playback fails. */
  posterImage?: string;
  title?: string;
  /** Small tracked label above the title. */
  kicker?: string;
  ctaLabel?: string;
  ctaLink?: string;
  /** Optional product shown as floating card on this panel */
  productId?: string;
}

export interface ShowcaseSection {
  _id: string;
  template: ShowcaseTemplate;
  title: string;
  subtitle?: string;
  cardStyle: ShowcaseCardStyle;
  isActive: boolean;
  order: number;
  /** product_showcase */
  tabs?: ShowcaseTab[];
  /** split_media */
  splitLeft?: SplitPanel;
  splitRight?: SplitPanel;
  createdAt?: string;
  updatedAt?: string;
}

export type ShowcaseSectionInput = Omit<
  ShowcaseSection,
  '_id' | 'createdAt' | 'updatedAt'
> & { _id?: string };

/** Normalized product shape for showcase cards */
export interface ShowcaseProductBadge {
  text: string;
  color: string;
}

export interface ShowcaseProductVariant {
  id: string;
  label: string;
  value: string;
  color: string;
  image?: string;
  price?: number;
}

export interface ShowcaseProduct {
  _id: string;
  name: string;
  slug: string;
  href: string;
  category: { label: string; link: string };
  images: string[];
  price: number;
  comparePrice?: number;
  badges?: ShowcaseProductBadge[];
  variants?: ShowcaseProductVariant[];
  isNewArrival?: boolean;
  isFeatured?: boolean;
  isLimitedEdition?: boolean;
}

/**
 * Option lists carry i18n keys rather than copy: they are module constants, so
 * they cannot call `t` themselves — the label is resolved at render.
 */
export const CARD_STYLE_OPTIONS: {
  value: ShowcaseCardStyle;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    value: 'showcase',
    labelKey: 'admin.showcase.cardStyles.showcase.label',
    descriptionKey: 'admin.showcase.cardStyles.showcase.description',
  },
  {
    value: 'luxury',
    labelKey: 'admin.showcase.cardStyles.luxury.label',
    descriptionKey: 'admin.showcase.cardStyles.luxury.description',
  },
  {
    value: 'compact',
    labelKey: 'admin.showcase.cardStyles.compact.label',
    descriptionKey: 'admin.showcase.cardStyles.compact.description',
  },
];

export const TEMPLATE_OPTIONS: {
  value: ShowcaseTemplate;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    value: 'product_showcase',
    labelKey: 'admin.showcase.templates.productShowcase.label',
    descriptionKey: 'admin.showcase.templates.productShowcase.description',
  },
  {
    value: 'split_media',
    labelKey: 'admin.showcase.templates.splitMedia.label',
    descriptionKey: 'admin.showcase.templates.splitMedia.description',
  },
];

/** The i18n key for a template's short name, for badges and slot labels. */
export function templateLabelKey(template: ShowcaseTemplate): string {
  return template === 'split_media'
    ? 'admin.showcase.templateBadge.splitMedia'
    : 'admin.showcase.templateBadge.productShowcase';
}

export const PRODUCT_SOURCE_OPTIONS: {
  value: ShowcaseProductSource;
  label: string;
}[] = [
  { value: 'manual', label: 'Hand-picked products' },
  { value: 'latest', label: 'Latest products' },
  { value: 'featured', label: 'Featured' },
  { value: 'new-arrivals', label: 'New arrivals' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'category', label: 'By category' },
];

export function emptyTab(index = 0): ShowcaseTab {
  return {
    id: `tab-${Date.now()}-${index}`,
    title: index === 0 ? 'New Arrivals' : `Collection ${index + 1}`,
    value: `tab_${index + 1}`,
    promotion: {
      image: '',
      video: '',
      kicker: 'Offer',
      title: 'Fresh. Trendy. Now.',
      subtitle: '',
      ctaLabel: "See What's New",
      ctaLink: '/products/new-arrivals',
    },
    productSource: 'new-arrivals',
    categorySlug: '',
    productIds: [],
    limit: 8,
  };
}

export function emptySplitPanel(): SplitPanel {
  return {
    mediaType: 'image',
    mediaUrl: '',
    posterImage: '',
    title: '',
    kicker: '',
    ctaLabel: '',
    ctaLink: '',
    productId: '',
  };
}

export function emptyShowcaseInput(
  template: ShowcaseTemplate = 'product_showcase'
): ShowcaseSectionInput {
  if (template === 'split_media') {
    return {
      template: 'split_media',
      title: 'Featured campaign',
      subtitle: '',
      cardStyle: 'compact',
      isActive: true,
      order: 0,
      tabs: [],
      splitLeft: {
        ...emptySplitPanel(),
        title: 'Everyday Comfort, Elevated Style',
        ctaLabel: 'Shop Now',
        ctaLink: '/products',
      },
      splitRight: emptySplitPanel(),
    };
  }

  return {
    template: 'product_showcase',
    title: 'New Arrivals',
    subtitle: 'Discover the latest pieces from our collection.',
    cardStyle: 'showcase',
    isActive: true,
    order: 0,
    tabs: [emptyTab(0)],
    splitLeft: undefined,
    splitRight: undefined,
  };
}

/* ── Template resolution ────────────────────────────────────────────────── */

/**
 * The stored template values, plus the hyphenated spellings that reach us from
 * hand-written payloads and older imports. Anything unrecognised is resolved
 * from context rather than silently becoming a product showcase — a section
 * that loses its template loses both split panels with it.
 */
const TEMPLATE_ALIASES: Record<string, ShowcaseTemplate> = {
  split_media: 'split_media',
  'split-media': 'split_media',
  splitmedia: 'split_media',
  product_showcase: 'product_showcase',
  'product-showcase': 'product_showcase',
  productshowcase: 'product_showcase',
};

/**
 * Whether a split panel holds anything worth keeping.
 *
 * Used both to rescue a section whose `template` was never written and to decide,
 * when an admin switches templates, whether the panels already on screen should
 * be preserved or replaced with the template's starter content.
 */
export const splitPanelHasContent = (panel: unknown): boolean => {
  if (!panel || typeof panel !== 'object') return false;
  const candidate = panel as Record<string, unknown>;
  return Boolean(
    String(candidate.mediaUrl || '').trim() ||
      String(candidate.title || '').trim() ||
      String(candidate.kicker || '').trim() ||
      String(candidate.ctaLabel || '').trim() ||
      String(candidate.productId || '').trim(),
  );
};

/**
 * Decide which template a section uses.
 *
 * `value` wins when it names a known template. Otherwise the `fallback` — the
 * template already stored for this section — is used, so a partial update that
 * omits the field cannot convert a split-media section into a product showcase.
 * Only when neither is available do the panels decide, which is what rescues
 * documents written before the field was populated.
 */
export function resolveShowcaseTemplate(
  value: unknown,
  fallback?: ShowcaseTemplate | null,
  hints?: { splitLeft?: unknown; splitRight?: unknown },
): ShowcaseTemplate {
  const named = TEMPLATE_ALIASES[String(value ?? '').trim().toLowerCase()];
  if (named) return named;
  if (fallback && TEMPLATE_ALIASES[fallback]) return fallback;
  if (
    splitPanelHasContent(hints?.splitLeft) ||
    splitPanelHasContent(hints?.splitRight)
  ) {
    return 'split_media';
  }
  return 'product_showcase';
}

/* ── Split-panel media ──────────────────────────────────────────────────── */

const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i;
const IMAGE_URL_PATTERN = /\.(jpe?g|png|webp|avif|gif|svg)(\?|#|$)/i;

/** Bunny stores uploads under `/videos/`, so the path is a reliable signal too. */
export function isShowcaseVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    VIDEO_URL_PATTERN.test(url) ||
    /\/videos?\//i.test(url) ||
    url.startsWith('data:video/')
  );
}

/** A URL that is unmistakably a still, whatever the record claims. */
export function isShowcaseImageUrl(url?: string | null): boolean {
  if (!url) return false;
  return IMAGE_URL_PATTERN.test(url) || url.startsWith('data:image/');
}

/**
 * Decide how to render a panel's asset.
 *
 * The URL wins whenever it is conclusive, in both directions: a `.mp4` saved as
 * an image used to render as a broken `<img>`, and a `.jpg` saved as a video
 * renders as a `<video>` that can never play. `mediaType` is only set when an
 * admin uploads through the form, so pasted URLs and pre-migration documents
 * routinely disagree with it. It is the tie-breaker, not the truth.
 */
export function resolvePanelMediaType(
  url: string,
  declared?: 'image' | 'video',
): 'image' | 'video' {
  if (isShowcaseVideoUrl(url)) return 'video';
  if (isShowcaseImageUrl(url)) return 'image';
  return declared === 'video' ? 'video' : 'image';
}

/* ── Media framing ──────────────────────────────────────────────────────── */

export type MediaOrientation = 'landscape' | 'square' | 'portrait' | 'tall';

export interface MediaFraming {
  orientation: MediaOrientation;
  /**
   * `object-position` for the asset inside a landscape panel. Applied as an
   * inline style rather than a class, because the value is computed from the
   * asset's own dimensions and Tailwind can only compile classes it can see.
   */
  objectPosition: string;
}

/**
 * Where to anchor the crop of an asset whose own shape is known.
 *
 * Split-media panels are landscape at every breakpoint — both halves of a
 * two-up grid have to agree on a height, so the frame cannot follow the media.
 * A vertical video therefore has to be cropped, and a centred crop is the wrong
 * one: phone-shot campaign footage frames its subject in the upper half, so
 * centring slices the top of the head off and fills the bottom third with
 * floor. Anchoring the crop high keeps the subject whole, and the taller the
 * asset the higher it has to sit. Landscape assets are already the frame's own
 * shape and stay centred.
 */
export function resolveMediaFraming(ratio?: number | null): MediaFraming {
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
    // Unknown shape — centre, which is right for the landscape media that most
    // uploads are and harmless for the rest until metadata arrives.
    return { orientation: 'landscape', objectPosition: '50% 50%' };
  }
  if (ratio >= 1.2) return { orientation: 'landscape', objectPosition: '50% 50%' };
  if (ratio >= 0.9) return { orientation: 'square', objectPosition: '50% 42%' };
  if (ratio >= 0.62) return { orientation: 'portrait', objectPosition: '50% 30%' };
  return { orientation: 'tall', objectPosition: '50% 22%' };
}

/** Intrinsic ratio of a loaded asset, or null when it cannot be measured. */
export function mediaRatio(width?: number | null, height?: number | null): number | null {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) return null;
  return width / height;
}

export interface ResolvedPanelMedia {
  mediaType: 'image' | 'video';
  /** The asset actually rendered. Empty when the panel has no usable media. */
  url: string;
  /** Poster for video, and the still fallback when playback fails. */
  poster: string;
}

/**
 * Collapse a panel's media fields into what the renderer needs.
 *
 * `mediaType` is treated as a hint rather than the truth: it is only set when an
 * admin uploads through the form, so a URL pasted into a legacy document — or a
 * video saved before the field existed — arrives marked as an image and renders
 * as a broken `<img>`. Sniffing the URL is what makes both panels play.
 */
export function resolveSplitPanelMedia(
  panel?: Pick<SplitPanel, 'mediaType' | 'mediaUrl' | 'posterImage'> | null,
): ResolvedPanelMedia {
  const url = (panel?.mediaUrl || '').trim();
  const poster = (panel?.posterImage || '').trim();
  const mediaType = resolvePanelMediaType(url, panel?.mediaType);

  return {
    mediaType,
    url,
    // An image panel is its own poster, so a failed <img> and a failed <video>
    // fall back through the same field.
    poster: poster || (mediaType === 'image' ? url : ''),
  };
}
