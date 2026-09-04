import { DEFAULT_STOREFRONT_COPY } from '@/lib/deals/copy';
import {
  DEAL_AUDIENCES,
  REWARD_TYPES,
  SETTLE_ON_BY_REWARD,
  TRIGGER_TYPES,
  type RewardType,
} from '@/lib/deals/types';

/**
 * Mirrors `lib/products/validate-payload.ts`: returns a list of human-readable
 * errors, empty when the payload is good. Called by the admin routes before a
 * write so a malformed reward config can never reach the engine.
 */
export function validateDealPayload(data: any): string[] {
  const errors: string[] = [];

  if (!data?.name || String(data.name).trim().length === 0) {
    errors.push('Deal name is required');
  }

  if (!REWARD_TYPES.includes(data?.rewardType)) {
    errors.push('A reward type is required');
    return errors;
  }
  const rewardType = data.rewardType as RewardType;

  if (!TRIGGER_TYPES.includes(data?.triggerType)) {
    errors.push('A trigger type is required');
  }
  if (!(Number(data?.triggerValue) > 0)) {
    errors.push('Trigger value must be greater than 0');
  }
  if (data?.triggerType === 'item_count_min' && !Number.isInteger(Number(data?.triggerValue))) {
    errors.push('An item-count trigger must be a whole number');
  }

  if (!DEAL_AUDIENCES.includes(data?.audience)) {
    errors.push('An audience is required');
  }
  if (data?.audience === 'customer_group' && !data?.audienceGroupId) {
    errors.push('Pick a customer group for a group-targeted deal');
  }

  const startsAt = toDate(data?.startsAt);
  const endsAt = toDate(data?.endsAt);
  if (!startsAt) errors.push('A start date is required');
  if (!endsAt) errors.push('An end date is required');
  if (startsAt && endsAt && endsAt <= startsAt) {
    errors.push('The end date must be after the start date');
  }

  if (data?.settleOn && data.settleOn !== SETTLE_ON_BY_REWARD[rewardType]) {
    errors.push(`${rewardType} rewards always settle on ${SETTLE_ON_BY_REWARD[rewardType]}`);
  }

  if (data?.priority !== undefined && !Number.isInteger(Number(data.priority))) {
    errors.push('Priority must be a whole number');
  }
  for (const field of ['usageLimit', 'usageLimitPerCustomer'] as const) {
    const value = data?.[field];
    if (value !== undefined && value !== null && value !== '' && !(Number(value) > 0)) {
      errors.push(`${field === 'usageLimit' ? 'Total usage limit' : 'Per-customer usage limit'} must be greater than 0`);
    }
  }

  errors.push(...validateRewardConfig(rewardType, data?.rewardConfig));
  errors.push(...validateStorefrontCopy(data?.storefrontCopy));

  return errors;
}

function validateRewardConfig(rewardType: RewardType, config: any): string[] {
  const errors: string[] = [];
  if (!config || typeof config !== 'object') {
    errors.push('Reward configuration is required');
    return errors;
  }

  switch (rewardType) {
    case 'FIXED_DISCOUNT':
      if (!(Number(config.amount) > 0)) errors.push('Discount amount must be greater than 0');
      break;

    case 'FREE_GIFT':
      if (!config.productId) errors.push('Pick a gift product');
      if (config.qty !== undefined && !(Number(config.qty) > 0)) {
        errors.push('Gift quantity must be at least 1');
      }
      break;

    case 'LOYALTY_POINTS':
      if (!(Number(config.points) > 0)) errors.push('Points awarded must be greater than 0');
      if (config.minClaimThreshold !== undefined && Number(config.minClaimThreshold) < 0) {
        errors.push('Minimum claim threshold cannot be negative');
      }
      if (!(Number(config.expiresAfterDays) > 0)) {
        errors.push('Points expiry must be at least 1 day');
      }
      break;

    case 'PUNCH_CARD': {
      if (!(Number(config.targetCount) > 1)) {
        errors.push('A punch card needs a target of at least 2 stamps');
      }
      const pool = Array.isArray(config.boxPool) ? config.boxPool : [];
      if (pool.length === 0) {
        errors.push('Add at least one product to the mystery box pool');
      }
      if (pool.some((entry: any) => !entry?.productId)) {
        errors.push('Every mystery box entry needs a product');
      }
      if (pool.length > 0 && !pool.some((entry: any) => Number(entry?.weight) > 0)) {
        errors.push('At least one mystery box entry needs a weight above 0');
      }
      break;
    }
  }

  return errors;
}

function validateStorefrontCopy(copy: any): string[] {
  const errors: string[] = [];
  if (!copy || typeof copy !== 'object') {
    errors.push('Storefront copy is required');
    return errors;
  }
  for (const field of Object.keys(DEFAULT_STOREFRONT_COPY.FIXED_DISCOUNT) as Array<
    keyof typeof DEFAULT_STOREFRONT_COPY.FIXED_DISCOUNT
  >) {
    if (!copy[field] || String(copy[field]).trim().length === 0) {
      errors.push(`Storefront ${field} copy cannot be empty`);
    }
  }
  return errors;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fills the fields the engine assumes exist, so a partial form still saves. */
export function normalizeDealPayload(data: any) {
  const rewardType = data.rewardType as RewardType;
  return {
    name: String(data.name).trim(),
    internalNote: data.internalNote ? String(data.internalNote).trim() : undefined,
    isActive: data.isActive !== false,
    priority: Number.isInteger(Number(data.priority)) ? Number(data.priority) : 100,
    isExclusive: data.isExclusive === true,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    audience: data.audience,
    audienceGroupId: data.audience === 'customer_group' ? data.audienceGroupId : null,
    triggerType: data.triggerType,
    triggerValue: Number(data.triggerValue),
    rewardType,
    settleOn: SETTLE_ON_BY_REWARD[rewardType],
    rewardConfig: normalizeRewardConfig(rewardType, data.rewardConfig),
    usageLimit: positiveOrNull(data.usageLimit),
    usageLimitPerCustomer: positiveOrNull(data.usageLimitPerCustomer),
    storefrontCopy: {
      locked: String(data.storefrontCopy?.locked ?? DEFAULT_STOREFRONT_COPY[rewardType].locked),
      unlocked: String(data.storefrontCopy?.unlocked ?? DEFAULT_STOREFRONT_COPY[rewardType].unlocked),
      badge: String(data.storefrontCopy?.badge ?? DEFAULT_STOREFRONT_COPY[rewardType].badge),
    },
  };
}

function normalizeRewardConfig(rewardType: RewardType, config: any) {
  switch (rewardType) {
    case 'FIXED_DISCOUNT':
      return { amount: Number(config.amount) };
    case 'FREE_GIFT':
      return {
        productId: String(config.productId),
        variantId: config.variantId ? String(config.variantId) : null,
        qty: Math.max(1, Math.floor(Number(config.qty) || 1)),
      };
    case 'LOYALTY_POINTS':
      return {
        points: Number(config.points),
        minClaimThreshold: Math.max(0, Number(config.minClaimThreshold) || 0),
        expiresAfterDays: Number(config.expiresAfterDays) || 365,
      };
    case 'PUNCH_CARD':
      return {
        targetCount: Number(config.targetCount),
        repeatable: config.repeatable !== false,
        boxPool: (Array.isArray(config.boxPool) ? config.boxPool : [])
          .filter((entry: any) => entry?.productId)
          .map((entry: any) => ({
            productId: String(entry.productId),
            variantId: entry.variantId ? String(entry.variantId) : null,
            weight: Math.max(0, Number(entry.weight) || 0),
          })),
      };
    default:
      return {};
  }
}

function positiveOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
