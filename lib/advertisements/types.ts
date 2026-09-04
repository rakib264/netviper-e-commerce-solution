/**
 * Advertisement domain model shared by the admin panel, the API routes and the
 * homepage renderer.
 *
 * An advertisement is a promotional media card — a Bunny-hosted image or video
 * with a deliberately minimal overlay (discount + call to action). Two families
 * exist, `horizontal` (wide bands) and `vertical` (tall panels); both share the
 * same shape and only differ in aspect ratio, so the renderer can treat them
 * uniformly.
 *
 * Media is mid-migration: older documents only carry `bannerImage`. `mediaUrl` /
 * `mediaType` are canonical going forward and `bannerImage` is kept in sync on
 * write (it doubles as the video poster), mirroring the `mediaToLegacy` pattern
 * in `lib/products/types.ts`.
 */

export const AD_TYPES = ['horizontal', 'vertical'] as const;
export type AdvertisementType = (typeof AD_TYPES)[number];

export const AD_MEDIA_TYPES = ['image', 'video'] as const;
export type AdMediaType = (typeof AD_MEDIA_TYPES)[number];

/**
 * How a band arranges its cards. `full-width` renders a single ad edge to edge;
 * `multi` renders up to `MAX_ADS_PER_TYPE` in equal-width columns.
 */
export const AD_LAYOUT_MODES = ['full-width', 'multi'] as const;
export type AdLayoutMode = (typeof AD_LAYOUT_MODES)[number];

/** Both families cap at three so `multi` always divides into equal columns. */
export const MAX_ADS_PER_TYPE = 3;

export interface AdCta {
  label: string;
  url: string;
}

export interface AdvertisementDTO {
  _id: string;
  type: AdvertisementType;
  position: number;
  badgeTitle?: string;
  /** Internal label. Not painted into the overlay — it is the accessible name. */
  title: string;
  discountText?: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  /** Still image shown before a video plays and whenever playback fails. */
  posterImage?: string;
  /** Legacy mirror of the still image. Kept in sync on write. */
  bannerImage?: string;
  cta?: AdCta;
  isActive: boolean;
}

const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i;

/** Bunny stores uploads under `/videos/`, so the path is a reliable signal too. */
export function isVideoAssetUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    VIDEO_URL_PATTERN.test(url) ||
    /\/videos\//i.test(url) ||
    url.startsWith('data:video/')
  );
}

export interface ResolvedAdMedia {
  mediaType: AdMediaType;
  /** The asset actually rendered. Empty when the ad has no usable media. */
  url: string;
  /** Poster for video, and the still fallback when playback fails. */
  poster: string;
}

/**
 * Collapse the canonical and legacy media fields into what the renderer needs.
 * Documents written before the video migration only have `bannerImage`; those
 * resolve to an image unless the stored URL is itself a video.
 */
export function resolveAdMedia(
  ad: Pick<
    AdvertisementDTO,
    'mediaType' | 'mediaUrl' | 'posterImage' | 'bannerImage'
  >,
): ResolvedAdMedia {
  const url = (ad.mediaUrl || ad.bannerImage || '').trim();
  const poster = (ad.posterImage || '').trim();
  const declaredVideo = ad.mediaType === 'video';
  const mediaType: AdMediaType =
    declaredVideo || isVideoAssetUrl(url) ? 'video' : 'image';

  // An image ad is its own poster, so a failed <img> and a failed <video> fall
  // back through the same field. The legacy mirror is only a poster if it is
  // actually a still — pre-migration documents sometimes stored the video there.
  const legacy = (ad.bannerImage || '').trim();
  const fallbackPoster =
    mediaType === 'image' ? url : isVideoAssetUrl(legacy) ? '' : legacy;

  return {
    mediaType,
    url,
    poster: poster || fallbackPoster,
  };
}

/* ── Payload normalisation ──────────────────────────────────────────────── */

const trimmed = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export interface NormalizedAdPayload {
  type?: AdvertisementType;
  position?: number;
  badgeTitle?: string;
  title?: string;
  discountText?: string;
  mediaType?: AdMediaType;
  mediaUrl?: string;
  posterImage?: string;
  bannerImage?: string;
  cta?: AdCta | null;
  isActive?: boolean;
}

export interface NormalizeResult {
  value: NormalizedAdPayload;
  errors: string[];
}

/**
 * Validate and coerce an untrusted create/update body.
 *
 * `partial` drives which fields are mandatory: a create needs a type, position
 * and media; an update only validates what it was given. Optional text fields
 * collapse to an empty string so a cleared input actually clears the stored
 * value rather than leaving the old one behind.
 */
export function normalizeAdvertisementPayload(
  input: unknown,
  { partial = false }: { partial?: boolean } = {},
): NormalizeResult {
  const errors: string[] = [];
  const value: NormalizedAdPayload = {};

  if (!input || typeof input !== 'object') {
    return { value, errors: ['A JSON body is required'] };
  }

  const raw = input as Record<string, unknown>;

  /* Type */
  if (typeof raw.type !== 'undefined' || !partial) {
    const type = trimmed(raw.type) as AdvertisementType;
    if (!AD_TYPES.includes(type)) {
      errors.push(`Type must be one of: ${AD_TYPES.join(', ')}`);
    } else {
      value.type = type;
    }
  }

  /* Position */
  if (typeof raw.position !== 'undefined' || !partial) {
    const position = Number(raw.position);
    if (!Number.isFinite(position) || position < 1 || position > MAX_ADS_PER_TYPE) {
      errors.push(`Position must be between 1 and ${MAX_ADS_PER_TYPE}`);
    } else {
      value.position = Math.round(position);
    }
  }

  /* Title — the accessible name, so it stays required. */
  if (typeof raw.title !== 'undefined' || !partial) {
    const title = trimmed(raw.title);
    if (title.length < 2) {
      errors.push('Title must be at least 2 characters');
    } else {
      value.title = title.slice(0, 160);
    }
  }

  /* Media */
  const hasMediaFields =
    typeof raw.mediaUrl !== 'undefined' ||
    typeof raw.bannerImage !== 'undefined' ||
    typeof raw.mediaType !== 'undefined';

  if (hasMediaFields || !partial) {
    const mediaUrl = trimmed(raw.mediaUrl) || trimmed(raw.bannerImage);
    if (!mediaUrl) {
      errors.push('An image or video is required');
    } else {
      const declared = trimmed(raw.mediaType) as AdMediaType;
      const mediaType: AdMediaType = AD_MEDIA_TYPES.includes(declared)
        ? declared
        : isVideoAssetUrl(mediaUrl)
          ? 'video'
          : 'image';

      const poster = trimmed(raw.posterImage);
      if (mediaType === 'video' && !poster) {
        // Not fatal: the renderer degrades to a colour wash, but flagging it in
        // the admin form is the difference between a smooth and a blank load.
        value.posterImage = '';
      } else {
        value.posterImage = poster;
      }

      value.mediaType = mediaType;
      value.mediaUrl = mediaUrl;
      // Legacy mirror: the still image only, so an old reader that renders it
      // as an <img> never receives a video URL.
      value.bannerImage = mediaType === 'image' ? mediaUrl : poster;
    }
  }

  /* Optional copy */
  if (typeof raw.badgeTitle !== 'undefined') {
    value.badgeTitle = trimmed(raw.badgeTitle).slice(0, 60);
  }
  if (typeof raw.discountText !== 'undefined') {
    value.discountText = trimmed(raw.discountText).slice(0, 60);
  }

  /* CTA — both halves or neither. */
  if (typeof raw.cta !== 'undefined') {
    if (raw.cta === null) {
      value.cta = null;
    } else if (typeof raw.cta === 'object') {
      const cta = raw.cta as Record<string, unknown>;
      const label = trimmed(cta.label).slice(0, 40);
      const url = trimmed(cta.url);
      if (!label && !url) {
        value.cta = null;
      } else if (!label || !url) {
        errors.push('A call to action needs both a label and a link');
      } else {
        value.cta = { label, url };
      }
    } else {
      errors.push('Call to action must be an object');
    }
  }

  if (typeof raw.isActive !== 'undefined') {
    value.isActive = Boolean(raw.isActive);
  }

  return { value, errors };
}

/** Coerce a stored/serialised document into the shape the storefront renders. */
export function toAdvertisementDTO(raw: Record<string, any>): AdvertisementDTO {
  const media = resolveAdMedia({
    mediaType: raw.mediaType,
    mediaUrl: raw.mediaUrl,
    posterImage: raw.posterImage,
    bannerImage: raw.bannerImage,
  });

  return {
    _id: String(raw._id),
    type: raw.type,
    position: Number(raw.position) || 1,
    badgeTitle: raw.badgeTitle || undefined,
    title: raw.title || '',
    discountText: raw.discountText || undefined,
    mediaType: media.mediaType,
    mediaUrl: media.url,
    posterImage: media.poster || undefined,
    bannerImage: raw.bannerImage || undefined,
    cta:
      raw.cta?.label && raw.cta?.url
        ? { label: raw.cta.label, url: raw.cta.url }
        : undefined,
    isActive: raw.isActive !== false,
  };
}
