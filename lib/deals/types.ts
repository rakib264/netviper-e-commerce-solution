/**
 * Shared vocabulary for the deals engine.
 *
 * Everything here is plain data — no Mongoose, no React — so the engine can be
 * unit tested off a literal and the same shapes can travel over the wire to the
 * storefront.
 */

export const REWARD_TYPES = [
  'FIXED_DISCOUNT',
  'FREE_GIFT',
  'LOYALTY_POINTS',
  'PUNCH_CARD',
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

/**
 * When a reward becomes real. `cart` rewards are recalculated on every cart
 * mutation and change what the customer pays; `delivered` rewards are granted
 * as `pending` at payment and released when the order is delivered.
 */
export const SETTLE_ON = ['cart', 'delivered'] as const;
export type SettleOn = (typeof SETTLE_ON)[number];

export const TRIGGER_TYPES = ['subtotal_min', 'item_count_min'] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const DEAL_AUDIENCES = ['all', 'new_customers', 'customer_group'] as const;
export type DealAudience = (typeof DEAL_AUDIENCES)[number];

/** The settle_on each reward type is locked to. */
export const SETTLE_ON_BY_REWARD: Record<RewardType, SettleOn> = {
  FIXED_DISCOUNT: 'cart',
  FREE_GIFT: 'cart',
  LOYALTY_POINTS: 'delivered',
  PUNCH_CARD: 'delivered',
};

/* ── Reward configuration ────────────────────────────────────────────── */

export interface FixedDiscountConfig {
  amount: number;
}

export interface FreeGiftConfig {
  productId: string;
  /** Variant id within the product, or null for a single-variant product. */
  variantId?: string | null;
  qty: number;
}

export interface LoyaltyPointsConfig {
  points: number;
  /** Points balance required before the wallet's claim CTA unlocks. */
  minClaimThreshold: number;
  expiresAfterDays: number;
}

export interface PunchCardBoxEntry {
  productId: string;
  variantId?: string | null;
  /** Relative draw weight; odds are weight / sum(weights). */
  weight: number;
}

export interface PunchCardConfig {
  targetCount: number;
  boxPool: PunchCardBoxEntry[];
  /** When true the card resets to zero on completion and can be filled again. */
  repeatable: boolean;
}

export type RewardConfig =
  | FixedDiscountConfig
  | FreeGiftConfig
  | LoyaltyPointsConfig
  | PunchCardConfig;

/**
 * Admin-authored storefront strings. These are content, not UI chrome, so they
 * are stored per deal rather than in the locale files. Supported placeholders:
 * `{remaining}`, `{points}`, `{gift}`.
 */
export interface StorefrontCopy {
  locked: string;
  unlocked: string;
  badge: string;
}

/* ── The deal itself ─────────────────────────────────────────────────── */

export interface DealDefinition {
  id: string;
  name: string;
  internalNote?: string;
  isActive: boolean;
  /** Lower runs first. Drag-to-reorder in the admin list writes this. */
  priority: number;
  isExclusive: boolean;
  startsAt: Date | string;
  endsAt: Date | string;
  audience: DealAudience;
  audienceGroupId?: string | null;
  triggerType: TriggerType;
  triggerValue: number;
  rewardType: RewardType;
  settleOn: SettleOn;
  rewardConfig: RewardConfig;
  usageLimit?: number | null;
  usageLimitPerCustomer?: number | null;
  usedCount: number;
  storefrontCopy: StorefrontCopy;
}

/* ── Cart ────────────────────────────────────────────────────────────── */

export interface CartLine {
  /** Product id — a 24-char ObjectId hex, matching the cart slice. */
  id: string;
  /** Variant label as the cart stores it (`attributeValue`), if any. */
  variant?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  maxQuantity?: number;
  /** Injected by the engine; never trusted when it arrives from a client. */
  isGift?: boolean;
  lockedQty?: boolean;
  sourceDealId?: string | null;
  /** A gift's normal price, struck through beside its zero. */
  listPrice?: number;
  /** Mirrored from the product so the engine can honour it without a lookup. */
  excludedFromPromotions?: boolean;
}

/** What the engine needs to know about a deal's gift product to inject it. */
export interface GiftCandidate {
  productId: string;
  variantId?: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  image?: string;
  inStock: boolean;
  giftable: boolean;
}

export interface CustomerContext {
  id?: string | null;
  /** A signed-in customer with no completed orders. Guests are never new. */
  isNewCustomer?: boolean;
  groupIds?: string[];
  /** How many times this customer has already redeemed each deal. */
  usageByDeal?: Record<string, number>;
}

/* ── Engine output ───────────────────────────────────────────────────── */

export interface AppliedDeal {
  dealId: string;
  name: string;
  rewardType: RewardType;
  settleOn: SettleOn;
  discountAmount: number;
  /** Frozen copy of the deal as it was when it applied. */
  rewardSnapshot: Record<string, unknown>;
}

export interface RewardPreview {
  label: string;
  image: string | null;
}

/**
 * The numbers behind a reward, so the cart can render each type in its own
 * shape — a discount row, a gift line, a points card, a stamp strip — without
 * re-reading the deal it came from. Only the fields a given reward type uses
 * are ever set.
 */
export interface RewardDetail {
  /** FIXED_DISCOUNT — money off, once the threshold is met. */
  discount_amount?: number;
  /** LOYALTY_POINTS — points credited after delivery. */
  points?: number;
  /** LOYALTY_POINTS — balance needed before the wallet's claim CTA unlocks. */
  min_claim_threshold?: number;
  /** PUNCH_CARD — slots on the card, and how many this cart fills. */
  stamp_target?: number;
  stamps_filled?: number;
  /** FREE_GIFT — the line the engine injects when this unlocks. */
  gift_name?: string;
  gift_qty?: number;
  gift_list_price?: number;
}

/** The storefront contract, snake_cased because it crosses the API boundary. */
export interface DealProgress {
  deal_id: string;
  reward_type: RewardType;
  settle_on: SettleOn;
  unlocked: boolean;
  current: number;
  target: number;
  percent: number;
  remaining: number;
  message: string;
  reward_preview: RewardPreview;
  /** Typed reward figures for the cart's per-type rendering. */
  reward_detail: RewardDetail;
}

export type SkipReason =
  | 'gift_out_of_stock'
  | 'gift_not_giftable'
  | 'gift_missing'
  | 'reward_misconfigured';

export interface SkipNotice {
  dealId: string;
  reason: SkipReason;
  detail: string;
}

export interface RecalculateResult {
  lines: CartLine[];
  /** Sum of non-gift, promotion-eligible lines. */
  subtotal: number;
  /** Sum of every non-gift line, including promotion-excluded ones. */
  cartTotal: number;
  dealDiscount: number;
  appliedDeals: AppliedDeal[];
  dealProgress: DealProgress[];
  skipped: SkipNotice[];
}

export interface RecalculateInput {
  lines: CartLine[];
  deals: DealDefinition[];
  now: Date;
  customer?: CustomerContext;
  /** Gift product data keyed by deal id. Absent entries skip the gift. */
  giftCatalog?: Record<string, GiftCandidate>;
  /** Injected so the engine never has to know about the active currency. */
  formatMoney?: (value: number) => string;
}
