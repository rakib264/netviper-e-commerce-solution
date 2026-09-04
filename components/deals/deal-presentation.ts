import type { DealProgress } from '@/lib/deals/types';

/**
 * The one place that turns a `DealProgress` into the words a reward is shown
 * with, so the cart rail and the storefront showcase cannot drift apart.
 *
 * `t` and `formatPrice` are passed in rather than hooked, because this is also
 * called from the admin dashboard where the currency context differs.
 */
export function dealHeadline(
  progress: DealProgress,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatPrice: (value: number) => string
): string {
  const detail = progress.reward_detail ?? {};
  switch (progress.reward_type) {
    case 'FIXED_DISCOUNT':
      return detail.discount_amount
        ? t('cart.deals.reward.discount', { amount: formatPrice(detail.discount_amount) })
        : progress.reward_preview.label;
    case 'FREE_GIFT':
      return detail.gift_name
        ? t('cart.deals.reward.gift', { gift: detail.gift_name })
        : progress.reward_preview.label;
    case 'LOYALTY_POINTS':
      return t('cart.deals.reward.points', { points: detail.points ?? 0 });
    default:
      return progress.reward_preview.label;
  }
}

/** "Spend ৳2,000" / "Collect 10 items" — the condition, stated plainly. */
export function dealRequirement(
  progress: DealProgress,
  t: (key: string, values?: Record<string, string | number>) => string,
  tPlural: (key: string, count: number, values?: Record<string, string | number>) => string,
  formatPrice: (value: number) => string
): string {
  if (progress.reward_type === 'PUNCH_CARD' || progress.reward_detail?.stamp_target) {
    return tPlural('deals.showcase.collectItems', Math.round(progress.target));
  }
  return t('deals.showcase.spend', { amount: formatPrice(progress.target) });
}
