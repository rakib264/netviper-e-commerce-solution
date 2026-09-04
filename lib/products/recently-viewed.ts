export interface RecentlyViewedProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  averageRating?: number;
  totalReviews?: number;
  category?: { name: string; slug: string };
  viewedAt: number;
}

const STORAGE_KEY = "recentlyViewedProducts";
const MAX_ITEMS = 12;

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentlyViewedProduct => Boolean(item?._id && item?.slug))
      .sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
  } catch {
    return [];
  }
}

/** Records a view, moving the product to the front of the list */
export function recordRecentlyViewed(
  product: Omit<RecentlyViewedProduct, "viewedAt">,
): RecentlyViewedProduct[] {
  if (typeof window === "undefined") return [];
  const entry: RecentlyViewedProduct = { ...product, viewedAt: Date.now() };
  const next = [entry, ...getRecentlyViewed().filter((p) => p._id !== product._id)].slice(
    0,
    MAX_ITEMS,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked — recently viewed is a nice-to-have.
  }
  return next;
}
