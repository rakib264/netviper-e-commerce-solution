import { DEFAULT_STOREFRONT_COPY } from '@/lib/deals/copy';
import type { DealStatus } from '@/lib/deals/status';
import type { DealAudience, RewardType, TriggerType } from '@/lib/deals/types';
import { Gift, Percent, Sparkles, Stamp, type LucideIcon } from 'lucide-react';

/**
 * Presentation metadata for the four reward types. The engine never reads
 * this — it exists so the list badges, the template cards and the reward step
 * all describe a deal the same way.
 */
export interface RewardTypeMeta {
  value: RewardType;
  label: string;
  icon: LucideIcon;
  /** One line for the template card in the empty state. */
  blurb: string;
  /** Tailwind classes for the list badge. */
  badgeClass: string;
  settlesLabel: string;
}

export const REWARD_TYPE_META: Record<RewardType, RewardTypeMeta> = {
  FIXED_DISCOUNT: {
    value: 'FIXED_DISCOUNT',
    label: 'Fixed discount',
    icon: Percent,
    blurb: 'Take a flat amount off once the cart reaches a threshold.',
    badgeClass: 'bg-primary-50 text-primary-700 border-primary-200',
    settlesLabel: 'Applies in the cart',
  },
  FREE_GIFT: {
    value: 'FREE_GIFT',
    label: 'Free gift',
    icon: Gift,
    blurb: 'Add a product to the cart at no charge once the cart qualifies.',
    badgeClass: 'bg-success-50 text-success-700 border-success-200',
    settlesLabel: 'Applies in the cart',
  },
  LOYALTY_POINTS: {
    value: 'LOYALTY_POINTS',
    label: 'Loyalty points',
    icon: Sparkles,
    blurb: 'Award points that land in the customer wallet after delivery.',
    badgeClass: 'bg-warning-50 text-warning-700 border-warning-200',
    settlesLabel: 'Granted after delivery',
  },
  PUNCH_CARD: {
    value: 'PUNCH_CARD',
    label: 'Punch card',
    icon: Stamp,
    blurb: 'Stamp a card each qualifying order and open a mystery box when it fills.',
    badgeClass: 'bg-secondary-100 text-secondary-700 border-secondary-300',
    settlesLabel: 'Granted after delivery',
  },
};

export const REWARD_TYPE_ORDER: RewardType[] = [
  'FIXED_DISCOUNT',
  'FREE_GIFT',
  'LOYALTY_POINTS',
  'PUNCH_CARD',
];

export const STATUS_META: Record<DealStatus, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-success-50 text-success-700 border-success-200' },
  scheduled: { label: 'Scheduled', className: 'bg-primary-50 text-primary-700 border-primary-200' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
  paused: { label: 'Paused', className: 'bg-warning-50 text-warning-700 border-warning-200' },
  exhausted: { label: 'Limit reached', className: 'bg-destructive-50 text-destructive-700 border-destructive-200' },
};

export const AUDIENCE_LABELS: Record<DealAudience, string> = {
  all: 'Everyone',
  new_customers: 'New customers',
  customer_group: 'A customer group',
};

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  subtotal_min: 'Cart subtotal reaches',
  item_count_min: 'Cart contains at least',
};

/** The default reward config a freshly picked reward type starts from. */
export const DEFAULT_REWARD_CONFIG: Record<RewardType, Record<string, any>> = {
  FIXED_DISCOUNT: { amount: 0 },
  FREE_GIFT: { productId: '', variantId: null, qty: 1 },
  LOYALTY_POINTS: { points: 100, minClaimThreshold: 500, expiresAfterDays: 365 },
  PUNCH_CARD: { targetCount: 10, boxPool: [], repeatable: true },
};

/** Template defaults behind the four empty-state cards. */
export const DEAL_TEMPLATES: Record<
  RewardType,
  { name: string; triggerType: TriggerType; triggerValue: number; rewardConfig: Record<string, any> }
> = {
  FIXED_DISCOUNT: {
    name: 'Spend and save',
    triggerType: 'subtotal_min',
    triggerValue: 2000,
    rewardConfig: { amount: 300 },
  },
  FREE_GIFT: {
    name: 'Free gift over threshold',
    triggerType: 'subtotal_min',
    triggerValue: 2000,
    rewardConfig: { productId: '', variantId: null, qty: 1 },
  },
  LOYALTY_POINTS: {
    name: 'Points on qualifying orders',
    triggerType: 'subtotal_min',
    triggerValue: 2000,
    rewardConfig: { points: 150, minClaimThreshold: 500, expiresAfterDays: 365 },
  },
  PUNCH_CARD: {
    name: 'Collect and win',
    triggerType: 'item_count_min',
    triggerValue: 5,
    rewardConfig: { targetCount: 10, boxPool: [], repeatable: true },
  },
};

export { DEFAULT_STOREFRONT_COPY };
