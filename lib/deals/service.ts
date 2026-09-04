import { DEFAULT_CURRENCY } from '@/lib/currency/config';
import { createCurrencyFormatter } from '@/lib/currency/format';
import { pendingRewardsFor, recalculateCart } from '@/lib/deals/engine';
import type {
  CartLine,
  CustomerContext,
  DealDefinition,
  FreeGiftConfig,
  GiftCandidate,
  RecalculateResult,
} from '@/lib/deals/types';
import Deal from '@/lib/models/Deal';
import Order from '@/lib/models/Order';
import OrderAppliedDeal from '@/lib/models/OrderAppliedDeal';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { getCachedLocalizationSettings } from '@/lib/theme/general-settings-server';
import mongoose from 'mongoose';

/** Maps a Mongoose document onto the plain shape the engine consumes. */
export function toDealDefinition(doc: any): DealDefinition {
  return {
    id: String(doc._id),
    name: doc.name,
    internalNote: doc.internalNote,
    isActive: doc.isActive,
    priority: doc.priority ?? 100,
    isExclusive: !!doc.isExclusive,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    audience: doc.audience,
    audienceGroupId: doc.audienceGroupId ?? null,
    triggerType: doc.triggerType,
    triggerValue: doc.triggerValue,
    rewardType: doc.rewardType,
    settleOn: doc.settleOn,
    rewardConfig: doc.rewardConfig || {},
    usageLimit: doc.usageLimit ?? null,
    usageLimitPerCustomer: doc.usageLimitPerCustomer ?? null,
    usedCount: doc.usedCount ?? 0,
    storefrontCopy: doc.storefrontCopy || { locked: '', unlocked: '', badge: '' },
  };
}

/** Every deal whose window is open right now, cheapest-first by priority. */
export async function loadRunningDeals(now: Date = new Date()): Promise<DealDefinition[]> {
  await connectDB();
  const docs = await Deal.find({
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  })
    .sort({ priority: 1 })
    .lean();
  return docs.map(toDealDefinition);
}

/**
 * Resolves the gift product for every FREE_GIFT deal, keyed by deal id.
 *
 * Stock is read here rather than in the engine so the engine stays pure — and
 * so an out-of-stock gift is a data fact the caller can log, not a branch
 * buried in the rules.
 */
export async function buildGiftCatalog(
  deals: DealDefinition[]
): Promise<Record<string, GiftCandidate>> {
  const giftDeals = deals.filter((deal) => deal.rewardType === 'FREE_GIFT');
  if (giftDeals.length === 0) return {};

  const productIds = giftDeals
    .map((deal) => (deal.rewardConfig as FreeGiftConfig).productId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  const byId = new Map(products.map((product: any) => [String(product._id), product]));

  const catalog: Record<string, GiftCandidate> = {};
  for (const deal of giftDeals) {
    const config = deal.rewardConfig as FreeGiftConfig;
    const product: any = byId.get(String(config.productId));
    if (!product) continue;

    const variant = config.variantId
      ? (product.variants || []).find((entry: any) => entry.id === config.variantId)
      : null;
    // A configured variant that has since been deleted is a missing gift, not
    // a silent fallback to the parent product.
    if (config.variantId && !variant) continue;

    catalog[deal.id] = {
      productId: String(product._id),
      variantId: variant?.id ?? null,
      variantLabel: variant?.attributeValue ?? variant?.value ?? undefined,
      name: variant ? `${product.name} — ${variant.attributeValue ?? variant.value}` : product.name,
      price: variant?.price ?? product.price,
      image: variant?.thumbnailImage || product.thumbnailImage,
      inStock: inStock(product, variant),
      giftable: product.giftable === true,
    };
  }
  return catalog;
}

function inStock(product: any, variant: any): boolean {
  if (variant) return variant.trackQuantity === false || (variant.quantity ?? 0) > 0;
  return product.trackQuantity === false || (product.quantity ?? 0) > 0;
}

/**
 * Who the cart belongs to, as far as audience and per-customer caps care.
 * Guests get an empty context — a per-person promise cannot be kept for
 * someone we cannot identify.
 */
export async function buildCustomerContext(customerId?: string | null): Promise<CustomerContext> {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) return {};
  await connectDB();

  const [user, completedOrders, usageRows] = await Promise.all([
    User.findById(customerId).select('customerGroups').lean() as Promise<any>,
    Order.countDocuments({
      customer: customerId,
      orderStatus: { $nin: ['cancelled'] },
    }),
    OrderAppliedDeal.aggregate([
      { $match: { customer: new mongoose.Types.ObjectId(customerId), reversedAt: null } },
      { $group: { _id: '$deal', count: { $sum: 1 } } },
    ]),
  ]);

  const usageByDeal: Record<string, number> = {};
  for (const row of usageRows as any[]) usageByDeal[String(row._id)] = row.count;

  return {
    id: String(customerId),
    isNewCustomer: completedOrders === 0,
    groupIds: user?.customerGroups || [],
    usageByDeal,
  };
}

/**
 * Rebuilds every cart line from the database.
 *
 * The client sends ids and quantities; prices, names, stock ceilings and the
 * `excludedFromPromotions` flag all come from the product row. Anything a
 * client marked as a gift is discarded — gifts are the engine's to create.
 */
export async function hydrateCartLines(rawLines: any[]): Promise<CartLine[]> {
  const incoming = (Array.isArray(rawLines) ? rawLines : []).filter(
    (line) => line && mongoose.Types.ObjectId.isValid(line.id) && Number(line.quantity) > 0
  );
  if (incoming.length === 0) return [];

  await connectDB();
  const products = await Product.find({
    _id: { $in: incoming.map((line) => line.id) },
    isActive: true,
  }).lean();
  const byId = new Map(products.map((product: any) => [String(product._id), product]));

  const lines: CartLine[] = [];
  for (const line of incoming) {
    const product: any = byId.get(String(line.id));
    if (!product) continue;

    const variant = line.variant
      ? (product.variants || []).find(
          (entry: any) =>
            entry.attributeValue === line.variant ||
            entry.value === line.variant ||
            entry.id === line.variant
        )
      : null;

    const available = variant
      ? variant.trackQuantity === false
        ? Number.MAX_SAFE_INTEGER
        : variant.quantity ?? 0
      : product.trackQuantity === false
        ? Number.MAX_SAFE_INTEGER
        : product.quantity ?? 0;

    const quantity = Math.max(0, Math.min(Math.floor(Number(line.quantity)), available));
    if (quantity === 0) continue;

    lines.push({
      id: String(product._id),
      variant: variant ? variant.attributeValue ?? variant.value : line.variant,
      name: product.name,
      price: variant?.price ?? product.price,
      quantity,
      image: variant?.thumbnailImage || product.thumbnailImage,
      maxQuantity: available === Number.MAX_SAFE_INTEGER ? quantity + 99 : available,
      excludedFromPromotions: product.excludedFromPromotions === true,
    });
  }
  return lines;
}

/** Currency formatter matching the storefront, for `{remaining}` in deal copy. */
export async function serverMoneyFormatter(): Promise<(value: number) => string> {
  try {
    const { currency } = await getCachedLocalizationSettings();
    return createCurrencyFormatter(currency).format;
  } catch {
    // The shipped default, not a specific currency: a failed settings read is
    // not a reason to start quoting deal amounts in the wrong money.
    return createCurrencyFormatter(DEFAULT_CURRENCY).format;
  }
}

export interface CartRecalculationOptions {
  lines: any[];
  customerId?: string | null;
  now?: Date;
}

/**
 * The one entry point both the cart API and order creation call. Running the
 * same function in both places is what makes a tampered client total harmless.
 */
export async function recalculateCartForRequest(
  options: CartRecalculationOptions
): Promise<{ result: RecalculateResult; deals: DealDefinition[] }> {
  const now = options.now ?? new Date();
  const [lines, deals, formatMoney] = await Promise.all([
    hydrateCartLines(options.lines),
    loadRunningDeals(now),
    serverMoneyFormatter(),
  ]);
  const [giftCatalog, customer] = await Promise.all([
    buildGiftCatalog(deals),
    buildCustomerContext(options.customerId),
  ]);

  const result = recalculateCart({ lines, deals, now, customer, giftCatalog, formatMoney });

  for (const notice of result.skipped) {
    console.warn(`[deals] skipped deal ${notice.dealId}: ${notice.reason} - ${notice.detail}`);
  }

  return { result, deals };
}

/**
 * Freezes the deals that fired onto the order and books their usage.
 *
 * `usedCount` moves here rather than in the cart so an abandoned cart never
 * burns a limited deal.
 */
export async function persistOrderDeals(
  orderId: string,
  customerId: string | null | undefined,
  result: RecalculateResult,
  deals: DealDefinition[]
): Promise<void> {
  // Cart rewards changed what was paid; delivered rewards are recorded now and
  // granted later. Both are the same row type, so settlement has one place to
  // look.
  const earned = [...result.appliedDeals, ...pendingRewardsFor(result, deals)];
  if (earned.length === 0) return;
  await connectDB();

  for (const applied of earned) {
    try {
      const write = await OrderAppliedDeal.updateOne(
        { order: orderId, deal: applied.dealId },
        {
          $setOnInsert: {
            order: orderId,
            deal: applied.dealId,
            customer: customerId || null,
            rewardType: applied.rewardType,
            settleOn: applied.settleOn,
            rewardSnapshot: applied.rewardSnapshot,
            discountAmount: applied.discountAmount,
          },
        },
        { upsert: true }
      );
      // Only the insert books usage, so a retried order write cannot burn a
      // limited deal twice.
      if (write.upsertedCount > 0) {
        await Deal.updateOne({ _id: applied.dealId }, { $inc: { usedCount: 1 } });
      }
    } catch (error) {
      console.error('[deals] failed to persist applied deal', applied.dealId, error);
    }
  }
}
