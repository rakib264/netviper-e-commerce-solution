import type { RewardType, StorefrontCopy } from '@/lib/deals/types';

/**
 * Placeholders an admin may write into the storefront copy fields. Anything
 * else is left verbatim so a stray brace never eats a word.
 */
export const COPY_PLACEHOLDERS = ['remaining', 'points', 'gift', 'reward'] as const;
export type CopyPlaceholder = (typeof COPY_PLACEHOLDERS)[number];

export type CopyValues = Partial<Record<CopyPlaceholder, string>>;

const PLACEHOLDER_PATTERN = /\{\s*(remaining|points|gift|reward)\s*\}/g;

/**
 * Replaces `{remaining}` / `{points}` / `{gift}` / `{reward}` with the supplied
 * values.
 */
export function interpolateCopy(template: string, values: CopyValues): string {
  if (!template) return '';
  return template.replace(PLACEHOLDER_PATTERN, (match, name: CopyPlaceholder) => {
    const value = values[name];
    return value === undefined || value === null ? match : value;
  });
}

/** Which placeholders a template actually uses — drives the editor's hints. */
export function usedPlaceholders(template: string): CopyPlaceholder[] {
  const found = new Set<CopyPlaceholder>();
  for (const match of String(template || '').matchAll(PLACEHOLDER_PATTERN)) {
    found.add(match[1] as CopyPlaceholder);
  }
  return COPY_PLACEHOLDERS.filter((placeholder) => found.has(placeholder));
}

/**
 * Starting copy for a new deal. The admin can rewrite every line; these exist
 * so a deal is never saved with an empty cart message.
 */
export const DEFAULT_STOREFRONT_COPY: Record<RewardType, StorefrontCopy> = {
  FIXED_DISCOUNT: {
    locked: 'Add {remaining} more to save {reward}',
    unlocked: 'Discount applied',
    badge: 'Discount',
  },
  FREE_GIFT: {
    locked: 'Add {remaining} more to get {gift} free',
    unlocked: '{gift} added to your cart, free',
    badge: 'Free gift',
  },
  LOYALTY_POINTS: {
    locked: 'Add {remaining} more to earn {points} points',
    unlocked: 'You will earn {points} points once this order is delivered',
    badge: '{points} points',
  },
  PUNCH_CARD: {
    locked: '{remaining} more items for a {reward}',
    unlocked: 'Your card is full — a {reward} is on its way',
    badge: 'Mystery Box',
  },
};
