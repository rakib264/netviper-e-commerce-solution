import 'server-only';

import ComboBundle, { type IComboBundle } from '@/lib/models/ComboBundle';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import {
  computeComboSavings,
  deriveComboType,
  isScheduleLive,
  sumComponentListPrices,
  type ResolvedComboBundle,
  type ResolvedComboComponent,
} from '@/lib/combo-bundles/types';

/**
 * Server-side resolution of a combo/bundle into everything a surface needs.
 *
 * Prices and availability are always derived here, from the products as they
 * are right now — never from anything the client sent, and never cached onto
 * the combo document. A component whose price changed, whose variant was
 * removed or whose stock ran out has to change the offer immediately, and this
 * is the single place that decides it.
 */

const UNLIMITED = Number.MAX_SAFE_INTEGER;

type ProductVariantLean = {
  id?: string;
  attributeName?: string;
  attributeValue?: string;
  value?: string;
  price?: number;
  quantity?: number;
  trackQuantity?: boolean;
  thumbnailImage?: string;
  image?: string;
};

type ProductLean = {
  _id: unknown;
  name?: string;
  slug?: string;
  price?: number;
  thumbnailImage?: string;
  images?: string[];
  quantity?: number;
  trackQuantity?: boolean;
  isActive?: boolean;
  variants?: ProductVariantLean[];
};

/** Stock of a product or one of its variants, with tracking switched off treated as unlimited. */
function availableUnits(
  product: ProductLean,
  variant?: ProductVariantLean,
): number {
  if (variant) {
    if (variant.trackQuantity === false) return UNLIMITED;
    return Math.max(0, Number(variant.quantity ?? 0));
  }
  if (product.trackQuantity === false) return UNLIMITED;
  return Math.max(0, Number(product.quantity ?? 0));
}

function findVariant(product: ProductLean, variantId?: string) {
  if (!variantId) return undefined;
  return (product.variants || []).find(
    (entry) =>
      entry.id === variantId ||
      entry.attributeValue === variantId ||
      entry.value === variantId,
  );
}

const asIso = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export interface ResolveOptions {
  now?: Date;
}

/**
 * Resolve a batch of combo documents in one pass.
 *
 * Batched because every surface that renders combos renders several: the
 * homepage rail, the listing page and the cart revalidation all resolve a list,
 * and doing it per-combo would be one product query each.
 */
export async function resolveComboBundles(
  docs: Array<IComboBundle | Record<string, any>>,
  { now = new Date() }: ResolveOptions = {},
): Promise<ResolvedComboBundle[]> {
  if (docs.length === 0) return [];

  await connectDB();

  const productIds = Array.from(
    new Set(
      docs.flatMap((doc) =>
        (doc.components || []).map((component: any) => String(component.product)),
      ),
    ),
  );

  const products = await Product.find({ _id: { $in: productIds } })
    .select(
      'name slug price thumbnailImage images quantity trackQuantity isActive variants',
    )
    .lean<ProductLean[]>();

  const byId = new Map(products.map((product) => [String(product._id), product]));

  return docs.map((doc) => resolveOne(doc, byId, now));
}

export async function resolveComboBundle(
  doc: IComboBundle | Record<string, any>,
  options: ResolveOptions = {},
): Promise<ResolvedComboBundle | null> {
  const [resolved] = await resolveComboBundles([doc], options);
  return resolved ?? null;
}

function resolveOne(
  doc: IComboBundle | Record<string, any>,
  byId: Map<string, ProductLean>,
  now: Date,
): ResolvedComboBundle {
  const raw = doc as Record<string, any>;
  const rawComponents = [...(raw.components || [])].sort(
    (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const components: ResolvedComboComponent[] = rawComponents.map((component: any) => {
    const productId = String(component.product);
    const product = byId.get(productId);
    const variant = product ? findVariant(product, component.variantId) : undefined;
    const qty = Math.max(1, Number(component.qty) || 1);

    // A component whose product is gone or archived is worth nothing and
    // available in no quantity — which is what takes the whole offer out of
    // stock below, rather than quietly selling a combo missing a piece.
    if (!product || product.isActive === false) {
      return {
        productId,
        name: product?.name || '',
        slug: product?.slug || '',
        image: product?.thumbnailImage || '',
        variantId: component.variantId || undefined,
        qty,
        unitPrice: 0,
        available: 0,
        maxCombos: 0,
        isActive: false,
      };
    }

    // A named variant that no longer exists is a broken component, not a
    // fallback to the base product: the price and stock would be the wrong
    // ones.
    if (component.variantId && !variant) {
      return {
        productId,
        name: product.name || '',
        slug: product.slug || '',
        image: product.thumbnailImage || '',
        variantId: component.variantId,
        qty,
        unitPrice: 0,
        available: 0,
        maxCombos: 0,
        isActive: false,
      };
    }

    const unitPrice = Math.max(
      0,
      Number(variant?.price || product.price || 0),
    );
    const available = availableUnits(product, variant);

    return {
      productId,
      name: product.name || '',
      slug: product.slug || '',
      image:
        variant?.thumbnailImage ||
        variant?.image ||
        product.thumbnailImage ||
        product.images?.[0] ||
        '',
      variantId: component.variantId || undefined,
      variantLabel: variant
        ? variant.attributeValue || variant.value || undefined
        : undefined,
      qty,
      unitPrice,
      available,
      maxCombos: available === UNLIMITED ? UNLIMITED : Math.floor(available / qty),
      isActive: true,
    };
  });

  const componentCount = components.length;
  const listTotal = sumComponentListPrices(components);
  const compareSource = Number(raw.compareAtPrice) > 0
    ? Number(raw.compareAtPrice)
    : listTotal;
  const price = Math.max(0, Math.round(Number(raw.price) || 0));
  const { compareAtPrice, savings, savingsPercent } = computeComboSavings(
    price,
    compareSource,
  );

  const maxUnits = components.length
    ? Math.min(...components.map((component) => component.maxCombos))
    : 0;

  // Combos are capped rather than sold unbounded even when every component has
  // tracking off, so a quantity stepper always has a sane ceiling.
  const cappedUnits = maxUnits === UNLIMITED ? 99 : Math.min(99, maxUnits);

  const scheduleLive = isScheduleLive(raw.startsAt, raw.endsAt, now);
  const images = (raw.images || []).filter(Boolean) as string[];

  return {
    _id: String(raw._id ?? ''),
    name: String(raw.name || ''),
    slug: String(raw.slug || ''),
    description: String(raw.description || ''),
    // A combo with no artwork of its own falls back to its components' stills,
    // so the rail and the listing never render an empty frame.
    images: images.length
      ? images
      : components.map((component) => component.image).filter(Boolean),
    comboType: deriveComboType(componentCount),
    badgeText: String(raw.badgeText || ''),
    price,
    compareAtPrice,
    savings,
    savingsPercent,
    components,
    componentCount,
    isActive: raw.isActive !== false,
    isFeatured: Boolean(raw.isFeatured),
    sortOrder: Number(raw.sortOrder ?? 0),
    isScheduleLive: scheduleLive,
    startsAt: asIso(raw.startsAt),
    endsAt: asIso(raw.endsAt),
    maxUnits: cappedUnits,
    inStock: cappedUnits > 0,
    unavailableComponents: components
      .filter((component) => component.maxCombos < 1)
      .map((component) => component.name || component.productId),
    createdAt: asIso(raw.createdAt) || undefined,
    updatedAt: asIso(raw.updatedAt) || undefined,
  };
}

/** Active, in-schedule combos in display order. */
export async function findLiveComboBundles(options?: {
  limit?: number;
  featuredOnly?: boolean;
  comboType?: 'combo' | 'bundle';
}): Promise<ResolvedComboBundle[]> {
  await connectDB();

  const now = new Date();
  const filter: Record<string, unknown> = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
  if (options?.featuredOnly) filter.isFeatured = true;
  if (options?.comboType) filter.comboType = options.comboType;

  const docs = await ComboBundle.find(filter)
    .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
    .limit(Math.max(1, Math.min(48, options?.limit ?? 24)))
    .lean();

  return resolveComboBundles(docs as Record<string, any>[], { now });
}

export async function findComboBundleBySlug(
  slug: string,
): Promise<ResolvedComboBundle | null> {
  await connectDB();
  const doc = await ComboBundle.findOne({ slug: String(slug || '').trim() }).lean();
  if (!doc) return null;
  return resolveComboBundle(doc as Record<string, any>);
}

/**
 * Server authority for one cart line.
 *
 * Every path that can turn a cart line into money — the cart revalidation
 * endpoint and order creation — goes through this rather than trusting the
 * price, the name or the availability the browser sent.
 */
export interface ComboLineResolution {
  ok: boolean;
  reason?: 'not_found' | 'inactive' | 'out_of_schedule' | 'insufficient_stock';
  combo?: ResolvedComboBundle;
  /** Quantity that can actually be sold, clamped to component stock. */
  sellableQty: number;
}

export async function resolveComboLine(
  comboBundleId: string,
  requestedQty: number,
): Promise<ComboLineResolution> {
  await connectDB();

  const doc = await ComboBundle.findById(comboBundleId).lean();
  if (!doc) return { ok: false, reason: 'not_found', sellableQty: 0 };

  const combo = await resolveComboBundle(doc as Record<string, any>);
  if (!combo) return { ok: false, reason: 'not_found', sellableQty: 0 };

  if (!combo.isActive) {
    return { ok: false, reason: 'inactive', combo, sellableQty: 0 };
  }
  if (!combo.isScheduleLive) {
    return { ok: false, reason: 'out_of_schedule', combo, sellableQty: 0 };
  }

  const wanted = Math.max(1, Math.floor(Number(requestedQty) || 1));
  const sellableQty = Math.min(wanted, combo.maxUnits);

  if (sellableQty < wanted) {
    return {
      ok: false,
      reason: 'insufficient_stock',
      combo,
      sellableQty: Math.max(0, sellableQty),
    };
  }

  return { ok: true, combo, sellableQty };
}
