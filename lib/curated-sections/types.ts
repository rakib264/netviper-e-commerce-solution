/**
 * Curated product sections — shared by the admin manager, the API routes and
 * the homepage renderer.
 *
 * A curated section is a reusable band of products with its own copy, its own
 * "View" route and its own place in the homepage order. Where a product
 * showcase is about *media* (promo panels, split campaigns), a curated section
 * is about *catalogue*: which products appear, and how they are chosen.
 *
 * Products come from one of three source modes:
 *
 *   manual  — exactly the products an admin picked, in the order they picked
 *   auto    — a live query (best selling by sales, newest, featured, …)
 *   hybrid  — the manual picks pinned first, topped up from the live query
 *
 * `hybrid` is the interesting one: "Best Selling" stays honest to the sales
 * data while still letting a merchandiser pin a launch to the front of it.
 */

import type { ShowcaseProduct } from '@/lib/product-showcase/types';

export const CURATED_SOURCE_MODES = ['manual', 'auto', 'hybrid'] as const;
export type CuratedSourceMode = (typeof CURATED_SOURCE_MODES)[number];

export const CURATED_AUTO_SOURCES = [
  'latest',
  'featured',
  'new-arrivals',
  'best-selling',
  'limited-edition',
  'category',
] as const;
export type CuratedAutoSource = (typeof CURATED_AUTO_SOURCES)[number];

/**
 * Layout treatments. One knob rather than several: each value is a finished
 * composition (grid shape, card family and spacing together), which keeps the
 * admin form short and the storefront consistent.
 */
export const CURATED_VARIANTS = ['grid', 'rail', 'editorial'] as const;
export type CuratedVariant = (typeof CURATED_VARIANTS)[number];

export const MAX_CURATED_PRODUCTS = 24;
export const MAX_MANUAL_PICKS = 24;

export interface CuratedSection {
  _id: string;
  /** Stable slug. Unique, and what the default CTA route is derived from. */
  key: string;
  /** Admin-facing name. Shown in the manager list and in Home Sections. */
  label: string;
  /* Storefront copy. */
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaText: string;
  /** Blank falls back to `defaultCtaHref`. */
  ctaHref: string;
  variant: CuratedVariant;
  isActive: boolean;
  order: number;
  sourceMode: CuratedSourceMode;
  autoSource: CuratedAutoSource;
  categorySlug: string;
  manualProductIds: string[];
  limit: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CuratedSectionInput = Omit<
  CuratedSection,
  '_id' | 'createdAt' | 'updatedAt'
> & { _id?: string };

/* ── Product origin ─────────────────────────────────────────────────────── */

/**
 * Where a resolved product came from.
 *
 * This is an **admin-only** concern: it tells a merchandiser whether a tile is
 * pinned or whether the query put it there. It is deliberately absent from
 * `CuratedProduct`, so the public payload cannot carry it even by accident —
 * see `toPublicProduct`.
 */
export const CURATED_ORIGINS = [
  'manual',
  'auto-best-selling',
  'auto-new',
  'auto-featured',
  'auto-limited',
  'auto-category',
  'auto-latest',
] as const;
export type CuratedOrigin = (typeof CURATED_ORIGINS)[number];

/** i18n key for an origin badge. Admin surfaces only. */
export function originLabelKey(origin: CuratedOrigin): string {
  return `admin.curatedSections.origin.${
    origin === 'manual' ? 'manual' : origin.replace('auto-', 'auto')
  }`;
}

/** The origin an auto-sourced product is tagged with. */
export function originForAutoSource(source: CuratedAutoSource): CuratedOrigin {
  switch (source) {
    case 'best-selling':
      return 'auto-best-selling';
    case 'new-arrivals':
      return 'auto-new';
    case 'featured':
      return 'auto-featured';
    case 'limited-edition':
      return 'auto-limited';
    case 'category':
      return 'auto-category';
    default:
      return 'auto-latest';
  }
}

/** What the storefront receives. Note the absence of `origin`. */
export type CuratedProduct = ShowcaseProduct;

/** What the admin preview receives. */
export type AdminCuratedProduct = ShowcaseProduct & { origin: CuratedOrigin };

/**
 * Strip the admin-only fields from a resolved product.
 *
 * The public route maps every product through this, so an internal label can
 * never reach a customer — not through the rendered HTML, and not through the
 * JSON payload behind it.
 */
export function toPublicProduct(product: AdminCuratedProduct): CuratedProduct {
  const { origin: _origin, ...rest } = product;
  return rest;
}

/* ── Routing ────────────────────────────────────────────────────────────── */

/**
 * Where a section's "View" button goes when the admin has not set a route.
 *
 * These resolve to the existing catalogue pages, which already carry the full
 * search / category / price / rating / sort / pagination behaviour — a curated
 * section is a window onto a listing, not a second implementation of one.
 */
export function defaultCtaHref(
  section: Pick<CuratedSection, 'sourceMode' | 'autoSource' | 'categorySlug'>,
): string {
  if (section.sourceMode === 'manual') return '/products';

  switch (section.autoSource) {
    case 'featured':
      return '/products/featured';
    case 'new-arrivals':
      return '/products/new-arrivals';
    case 'best-selling':
      return '/products/best-selling';
    case 'limited-edition':
      return '/products/limited-edition';
    case 'category':
      return section.categorySlug
        ? `/categories/${section.categorySlug}`
        : '/products';
    default:
      return '/products';
  }
}

export function resolveCtaHref(section: CuratedSection): string {
  return (section.ctaHref || '').trim() || defaultCtaHref(section);
}

/* ── Normalisation ──────────────────────────────────────────────────────── */

const trimmed = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export interface NormalizeCuratedResult {
  value: CuratedSectionInput;
  errors: string[];
}

/**
 * Validate and coerce an untrusted create/update body.
 *
 * `current` supplies the stored values an update may omit, so a partial write
 * cannot blank a section's copy or reset its source mode.
 */
export function normalizeCuratedSection(
  input: unknown,
  current?: Partial<CuratedSection> | null,
): NormalizeCuratedResult {
  const errors: string[] = [];
  const raw = (input && typeof input === 'object' ? input : {}) as Record<
    string,
    unknown
  >;

  const has = (field: string) => typeof raw[field] !== 'undefined';
  const text = (field: string, max: number, fallback = '') =>
    has(field) ? trimmed(raw[field], max) : ((current?.[field as keyof CuratedSection] as string) ?? fallback);

  const label = text('label', 80);
  if (!label) errors.push('A section name is required');

  const key =
    slugifyKey(has('key') ? String(raw.key ?? '') : current?.key || '') ||
    slugifyKey(label);
  if (!key) errors.push('A section key is required');

  const sourceMode = (
    CURATED_SOURCE_MODES.includes(raw.sourceMode as CuratedSourceMode)
      ? raw.sourceMode
      : current?.sourceMode || 'auto'
  ) as CuratedSourceMode;

  const autoSource = (
    CURATED_AUTO_SOURCES.includes(raw.autoSource as CuratedAutoSource)
      ? raw.autoSource
      : current?.autoSource || 'latest'
  ) as CuratedAutoSource;

  const variant = (
    CURATED_VARIANTS.includes(raw.variant as CuratedVariant)
      ? raw.variant
      : current?.variant || 'grid'
  ) as CuratedVariant;

  const categorySlug = slugifyKey(text('categorySlug', 80));
  if (sourceMode !== 'manual' && autoSource === 'category' && !categorySlug) {
    errors.push('A category source needs a category slug');
  }

  const manualProductIds = has('manualProductIds')
    ? (Array.isArray(raw.manualProductIds) ? raw.manualProductIds : [])
        .map((id) => String(id).trim())
        .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
        .slice(0, MAX_MANUAL_PICKS)
    : current?.manualProductIds || [];

  if (sourceMode === 'manual' && manualProductIds.length === 0) {
    errors.push('A manual section needs at least one product');
  }

  const rawLimit = has('limit') ? Number(raw.limit) : current?.limit ?? 8;
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(MAX_CURATED_PRODUCTS, Math.round(rawLimit)))
    : 8;

  // Deduplicate, so a hybrid section cannot pin the same product twice.
  const uniqueManual = [...new Set(manualProductIds)];

  return {
    value: {
      key,
      label,
      eyebrow: text('eyebrow', 80),
      title: text('title', 160) || label,
      subtitle: text('subtitle', 300),
      ctaText: text('ctaText', 60),
      ctaHref: text('ctaHref', 300),
      variant,
      isActive: has('isActive')
        ? Boolean(raw.isActive)
        : current?.isActive !== false,
      order: has('order') ? Number(raw.order) || 0 : current?.order ?? 0,
      sourceMode,
      autoSource,
      categorySlug,
      manualProductIds: uniqueManual,
      limit,
    },
    errors,
  };
}

/** Coerce a stored document into the shape the app renders. */
export function toCuratedSection(raw: Record<string, any>): CuratedSection {
  return {
    _id: String(raw._id),
    key: String(raw.key || ''),
    label: String(raw.label || ''),
    eyebrow: String(raw.eyebrow || ''),
    title: String(raw.title || ''),
    subtitle: String(raw.subtitle || ''),
    ctaText: String(raw.ctaText || ''),
    ctaHref: String(raw.ctaHref || ''),
    variant: CURATED_VARIANTS.includes(raw.variant) ? raw.variant : 'grid',
    isActive: raw.isActive !== false,
    order: Number(raw.order) || 0,
    sourceMode: CURATED_SOURCE_MODES.includes(raw.sourceMode)
      ? raw.sourceMode
      : 'auto',
    autoSource: CURATED_AUTO_SOURCES.includes(raw.autoSource)
      ? raw.autoSource
      : 'latest',
    categorySlug: String(raw.categorySlug || ''),
    manualProductIds: Array.isArray(raw.manualProductIds)
      ? raw.manualProductIds.map(String)
      : [],
    limit: Number(raw.limit) || 8,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}
