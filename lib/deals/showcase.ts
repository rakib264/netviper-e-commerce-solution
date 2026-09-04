import type { DealDefinition, DealProgress, FreeGiftConfig } from '@/lib/deals/types';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

/**
 * A running deal, described for a marketing surface rather than a cart.
 *
 * `DealProgress` answers "how close is this cart"; a shopfront panel also needs
 * to know whose deal it is, when it stops, how much of it is left, and where to
 * send someone who wants it. Those live here rather than in the engine, which
 * stays pure and cart-shaped.
 */
export interface ActiveDealSummary extends DealProgress {
  name: string;
  ends_at: string;
  /** Days until the window closes; 0 on the last day. Negative never ships. */
  ends_in_days: number;
  used_count: number;
  usage_limit: number | null;
  /** Where the panel's CTA points. */
  cta_href: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves a landing target per deal.
 *
 * A gift deal has a real product behind it, so its CTA goes to that product's
 * collection — the shortest path to a cart that qualifies. Everything else is a
 * spend threshold with no particular category, so it goes to the full
 * catalogue. A missing category degrades to the catalogue rather than a 404.
 */
async function giftCollectionHrefs(deals: DealDefinition[]): Promise<Record<string, string>> {
  const giftDeals = deals.filter((deal) => deal.rewardType === 'FREE_GIFT');
  if (giftDeals.length === 0) return {};

  const productIds = giftDeals
    .map((deal) => (deal.rewardConfig as FreeGiftConfig).productId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
  if (productIds.length === 0) return {};

  await connectDB();
  const products = await Product.find({ _id: { $in: productIds } })
    .select('category')
    .lean();
  const categoryIds = products.map((product: any) => product.category).filter(Boolean);
  const categories = await Category.find({ _id: { $in: categoryIds } })
    .select('slug')
    .lean();

  const slugByCategory = new Map(
    categories.map((category: any) => [String(category._id), category.slug])
  );
  const categoryByProduct = new Map(
    products.map((product: any) => [String(product._id), String(product.category)])
  );

  const hrefs: Record<string, string> = {};
  for (const deal of giftDeals) {
    const productId = String((deal.rewardConfig as FreeGiftConfig).productId);
    const slug = slugByCategory.get(categoryByProduct.get(productId) ?? '');
    if (slug) hrefs[deal.id] = `/categories/${slug}`;
  }
  return hrefs;
}

export async function buildActiveDealSummaries(
  progress: DealProgress[],
  deals: DealDefinition[],
  now: Date = new Date()
): Promise<ActiveDealSummary[]> {
  const byId = new Map(deals.map((deal) => [deal.id, deal]));
  const giftHrefs = await giftCollectionHrefs(deals);

  return progress.flatMap((entry) => {
    const deal = byId.get(entry.deal_id);
    if (!deal) return [];

    const endsAt = new Date(deal.endsAt);
    const endsInDays = Math.max(
      0,
      Math.ceil((endsAt.getTime() - now.getTime()) / MS_PER_DAY)
    );

    return [
      {
        ...entry,
        name: deal.name,
        ends_at: endsAt.toISOString(),
        ends_in_days: endsInDays,
        used_count: deal.usedCount ?? 0,
        usage_limit: deal.usageLimit ?? null,
        cta_href: giftHrefs[deal.id] ?? '/products',
      },
    ];
  });
}
