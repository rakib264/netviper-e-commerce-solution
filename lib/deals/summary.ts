import { dealStatus } from '@/lib/deals/status';
import type {
  DealDefinition,
  FixedDiscountConfig,
  FreeGiftConfig,
  LoyaltyPointsConfig,
  PunchCardConfig,
} from '@/lib/deals/types';

export interface SummaryOptions {
  formatMoney?: (value: number) => string;
  formatDate?: (value: Date) => string;
  /** Resolved gift product name, when the editor has one loaded. */
  giftName?: string;
  /** Human label for `audienceGroupId`. */
  groupName?: string;
  now?: Date;
}

const DEFAULT_DATE = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

/**
 * Renders a deal as a sentence, for the editor's persistent summary card:
 * "When cart subtotal reaches 2.000 €, give 300 € off. Live Sep 1 - Sep 30."
 *
 * Pure and formatter-injected so it reads the same in the admin panel and in a
 * test.
 */
export function summarizeDeal(
  deal: Partial<DealDefinition>,
  options: SummaryOptions = {}
): string {
  const money = options.formatMoney ?? ((value: number) => String(Math.round(value)));
  const date = options.formatDate ?? ((value: Date) => DEFAULT_DATE.format(value));

  const sentences = [`${triggerClause(deal, money)}, ${rewardClause(deal, money, options)}${audienceClause(deal, options)}.`];

  const window = windowClause(deal, date, options.now);
  if (window) sentences.push(window);
  if (deal.isExclusive) sentences.push('It runs on its own — no other cart deal stacks with it.');

  return sentences.join(' ');
}

function triggerClause(deal: Partial<DealDefinition>, money: (value: number) => string): string {
  const value = Number(deal.triggerValue) || 0;
  if (deal.triggerType === 'item_count_min') {
    return `When the cart holds ${value} qualifying item${value === 1 ? '' : 's'}`;
  }
  return `When cart subtotal reaches ${money(value)}`;
}

function rewardClause(
  deal: Partial<DealDefinition>,
  money: (value: number) => string,
  options: SummaryOptions
): string {
  const config = (deal.rewardConfig || {}) as any;

  switch (deal.rewardType) {
    case 'FIXED_DISCOUNT':
      return `give ${money(Number((config as FixedDiscountConfig).amount) || 0)} off`;

    case 'FREE_GIFT': {
      const qty = Number((config as FreeGiftConfig).qty) || 1;
      const name = options.giftName || 'the gift product';
      return `add ${qty > 1 ? `${qty} × ` : ''}${name} to the cart, free`;
    }

    case 'LOYALTY_POINTS':
      return `award ${Number((config as LoyaltyPointsConfig).points) || 0} points once the order is delivered`;

    case 'PUNCH_CARD': {
      const target = Number((config as PunchCardConfig).targetCount) || 0;
      return `add a stamp toward a ${target}-stamp card that opens a mystery box`;
    }

    default:
      return 'give a reward';
  }
}

function audienceClause(deal: Partial<DealDefinition>, options: SummaryOptions): string {
  if (deal.audience === 'new_customers') return ' for new customers';
  if (deal.audience === 'customer_group') {
    return ` for the ${options.groupName || deal.audienceGroupId || 'selected'} group`;
  }
  return '';
}

function windowClause(
  deal: Partial<DealDefinition>,
  format: (value: Date) => string,
  now?: Date
): string {
  if (!deal.startsAt || !deal.endsAt) return '';
  const starts = new Date(deal.startsAt);
  const ends = new Date(deal.endsAt);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return '';

  const status = dealStatus(
    {
      isActive: deal.isActive !== false,
      startsAt: starts,
      endsAt: ends,
      usageLimit: deal.usageLimit ?? null,
      usedCount: deal.usedCount ?? 0,
    },
    now ?? new Date()
  );

  const prefix = {
    live: 'Live',
    scheduled: 'Scheduled',
    expired: 'Ran',
    paused: 'Paused, would run',
    exhausted: 'Limit reached, window',
  }[status];

  return `${prefix} ${format(starts)} - ${format(ends)}.`;
}
