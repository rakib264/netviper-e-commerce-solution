import type { DealDefinition } from '@/lib/deals/types';

export const DEAL_STATUSES = ['scheduled', 'live', 'expired', 'paused', 'exhausted'] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

type StatusInput = Pick<
  DealDefinition,
  'isActive' | 'startsAt' | 'endsAt' | 'usageLimit' | 'usedCount'
>;

/**
 * The pill shown in the admin list. `paused` wins over every date-derived
 * state — an admin who flips the toggle wants to see that reflected even for a
 * deal whose window has not opened yet.
 */
export function dealStatus(deal: StatusInput, now: Date = new Date()): DealStatus {
  if (!deal.isActive) return 'paused';

  const startsAt = new Date(deal.startsAt).getTime();
  const endsAt = new Date(deal.endsAt).getTime();
  const at = now.getTime();

  if (Number.isFinite(endsAt) && at > endsAt) return 'expired';
  if (Number.isFinite(startsAt) && at < startsAt) return 'scheduled';
  if (deal.usageLimit && deal.usedCount >= deal.usageLimit) return 'exhausted';
  return 'live';
}

/** True when a deal is currently redeemable, ignoring audience and trigger. */
export function isRunning(deal: StatusInput, now: Date = new Date()): boolean {
  return dealStatus(deal, now) === 'live';
}
