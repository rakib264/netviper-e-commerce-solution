/**
 * Combo / Bundle offers — shared domain types.
 *
 * A combo/bundle is a **catalog entity**, not a cart-threshold reward: it is
 * one sellable unit with its own name, media and fixed price, whose stock is
 * borrowed from the products it is made of. Threshold rewards live in
 * `lib/deals/*` and are deliberately untouched by any of this.
 *
 * The only difference between a "combo" and a "bundle" is how many components
 * it has, so the type is derived — never stored as an independent choice an
 * admin could contradict.
 */

export const MIN_COMPONENTS = 2;
export const MAX_COMPONENTS = 12;
export const MAX_COMPONENT_QTY = 20;

export type ComboType = 'combo' | 'bundle';

/** Exactly two components is a combo; three or more is a bundle. */
export function deriveComboType(componentCount: number): ComboType {
  return componentCount >= 3 ? 'bundle' : 'combo';
}

export interface ComboComponentInput {
  productId: string;
  /** Variant id on the product, when the component is a specific variant. */
  variantId?: string;
  qty: number;
  sortOrder: number;
}

export interface ComboBundleInput {
  name: string;
  slug: string;
  description: string;
  images: string[];
  components: ComboComponentInput[];
  price: number;
  /** Set to override the summed component list prices; 0 means "compute it". */
  compareAtPrice: number;
  badgeText: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

/* ── Resolved shapes (what the storefront reads) ─────────────────────────── */

export interface ResolvedComboComponent {
  productId: string;
  name: string;
  slug: string;
  image: string;
  variantId?: string;
  /** Human-readable variant, e.g. "Cognac". */
  variantLabel?: string;
  qty: number;
  /** List price of one unit of this component, at its selected variant. */
  unitPrice: number;
  /** Units of this component available for sale right now. */
  available: number;
  /** How many whole combos this component alone could satisfy. */
  maxCombos: number;
  isActive: boolean;
}

export interface ResolvedComboBundle {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  comboType: ComboType;
  badgeText: string;
  price: number;
  /** Sum of component list prices, or the admin's override. */
  compareAtPrice: number;
  savings: number;
  savingsPercent: number;
  components: ResolvedComboComponent[];
  componentCount: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  /** Whether the schedule window is open right now. */
  isScheduleLive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** Combos that can be sold given every component's stock. 0 = sold out. */
  maxUnits: number;
  inStock: boolean;
  /** Components short of stock, for a precise out-of-stock message. */
  unavailableComponents: string[];
  createdAt?: string;
  updatedAt?: string;
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */

export function sumComponentListPrices(
  components: Array<{ unitPrice: number; qty: number }>,
): number {
  return components.reduce(
    (total, component) =>
      total + Math.max(0, component.unitPrice) * Math.max(1, component.qty),
    0,
  );
}

export interface ComboSavings {
  compareAtPrice: number;
  savings: number;
  savingsPercent: number;
}

/**
 * Savings against the component list prices.
 *
 * A percentage is only meaningful when there is something to compare against
 * and the combo is genuinely cheaper, so anything else reports zero and the UI
 * simply omits the badge rather than printing "Save 0%".
 */
export function computeComboSavings(
  price: number,
  compareAtPrice: number,
): ComboSavings {
  const compare = Math.max(0, Math.round(compareAtPrice));
  const fixed = Math.max(0, Math.round(price));
  if (!compare || compare <= fixed) {
    return { compareAtPrice: compare, savings: 0, savingsPercent: 0 };
  }
  const savings = compare - fixed;
  return {
    compareAtPrice: compare,
    savings,
    savingsPercent: Math.round((savings / compare) * 100),
  };
}

/* ── Slugs ───────────────────────────────────────────────────────────────── */

export function comboSlugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/* ── Validation ──────────────────────────────────────────────────────────── */

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export interface NormalizedComboBundle {
  value: ComboBundleInput;
  errors: string[];
}

/**
 * Validate and coerce an admin payload.
 *
 * Returns errors rather than throwing so the route can answer with all of them
 * at once, which is how the neighbouring product and curated-section writers
 * behave. Component *existence* is checked in the route, where the DB is.
 */
export function normalizeComboBundle(raw: unknown): NormalizedComboBundle {
  const body = (raw || {}) as Record<string, any>;
  const errors: string[] = [];

  const name = String(body.name || '').trim().slice(0, 160);
  if (!name) errors.push('A name is required');

  const slug = comboSlugify(body.slug || name);
  if (!slug) errors.push('A slug is required');

  const componentsRaw = Array.isArray(body.components) ? body.components : [];
  const seen = new Set<string>();
  const components: ComboComponentInput[] = [];

  componentsRaw.slice(0, MAX_COMPONENTS).forEach((entry: any, index: number) => {
    const productId = String(entry?.productId || '').trim();
    if (!OBJECT_ID.test(productId)) {
      errors.push(`Component ${index + 1} has an invalid product`);
      return;
    }
    const variantId = String(entry?.variantId || '').trim();
    // The same product may appear twice only as two different variants.
    const key = `${productId}:${variantId}`;
    if (seen.has(key)) {
      errors.push(`Component ${index + 1} is already in this offer`);
      return;
    }
    seen.add(key);

    components.push({
      productId,
      variantId: variantId || undefined,
      qty: Math.max(1, Math.min(MAX_COMPONENT_QTY, Math.floor(Number(entry?.qty) || 1))),
      sortOrder: Number.isFinite(Number(entry?.sortOrder))
        ? Number(entry.sortOrder)
        : index,
    });
  });

  components.sort((a, b) => a.sortOrder - b.sortOrder);
  components.forEach((component, index) => {
    component.sortOrder = index;
  });

  if (components.length < MIN_COMPONENTS) {
    errors.push(`Add at least ${MIN_COMPONENTS} products`);
  }

  const price = Math.round(Number(body.price));
  if (!Number.isFinite(price) || price <= 0) {
    errors.push('A fixed price above zero is required');
  }

  const compareAtRaw = Math.round(Number(body.compareAtPrice) || 0);
  const compareAtPrice = Number.isFinite(compareAtRaw) && compareAtRaw > 0 ? compareAtRaw : 0;

  const images = (Array.isArray(body.images) ? body.images : [])
    .map((image: unknown) => String(image || '').trim())
    .filter(Boolean)
    .slice(0, 8);

  const toIso = (value: unknown): string | null => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const startsAt = toIso(body.startsAt);
  const endsAt = toIso(body.endsAt);
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    errors.push('The end date must be after the start date');
  }

  return {
    value: {
      name,
      slug,
      description: String(body.description || '').trim().slice(0, 4000),
      images,
      components,
      price: Number.isFinite(price) ? Math.max(0, price) : 0,
      compareAtPrice,
      badgeText: String(body.badgeText || '').trim().slice(0, 40),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      isFeatured: Boolean(body.isFeatured),
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      startsAt,
      endsAt,
    },
    errors,
  };
}

/** Whether a schedule window is open at `now`. Both ends are optional. */
export function isScheduleLive(
  startsAt: string | Date | null | undefined,
  endsAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const time = now.getTime();
  if (startsAt && new Date(startsAt).getTime() > time) return false;
  if (endsAt && new Date(endsAt).getTime() < time) return false;
  return true;
}
