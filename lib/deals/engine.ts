import { interpolateCopy, type CopyValues } from '@/lib/deals/copy';
import { isRunning } from '@/lib/deals/status';
import type {
  AppliedDeal,
  CartLine,
  CustomerContext,
  DealDefinition,
  DealProgress,
  FixedDiscountConfig,
  FreeGiftConfig,
  GiftCandidate,
  LoyaltyPointsConfig,
  PunchCardConfig,
  RecalculateInput,
  RecalculateResult,
  RewardDetail,
  SkipNotice,
} from '@/lib/deals/types';

/**
 * The single rules engine behind every reward type.
 *
 * `recalculateCart` is pure: it takes the cart, the deals that could possibly
 * apply, and the few facts it cannot derive (gift stock, who the customer is),
 * and returns a rebuilt cart. Nothing in here touches the database, so it runs
 * identically in the cart API and in the server-side re-check at order
 * creation — which is the point, because a client-sent total is never trusted.
 */
export function recalculateCart(input: RecalculateInput): RecalculateResult {
  const { deals, now, customer, giftCatalog = {} } = input;
  const formatMoney = input.formatMoney ?? ((value: number) => String(Math.round(value)));

  // 1. Rebuild from a clean cart. Patching gift lines in place is how stale
  //    gifts survive a threshold drop, so they are always thrown away first.
  const lines: CartLine[] = (input.lines || [])
    .filter((line) => !line.isGift)
    .map((line) => ({ ...line, isGift: false, lockedQty: false, sourceDealId: null }));

  // 2. Gifts never count toward a trigger, and neither do products the
  //    merchant has excluded from promotions.
  const eligibleLines = lines.filter((line) => !line.excludedFromPromotions);
  const subtotal = sumLines(eligibleLines);
  const cartTotal = sumLines(lines);
  const eligibleItemCount = eligibleLines.reduce((total, line) => total + line.quantity, 0);

  // 3. Narrow to the deals that could fire for this customer, cheapest checks
  //    first, then order by priority so exclusivity is deterministic.
  const candidates = deals
    .filter((deal) => isRunning(deal, now))
    .filter((deal) => audienceMatches(deal, customer))
    .filter((deal) => withinPerCustomerLimit(deal, customer))
    .slice()
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const skipped: SkipNotice[] = [];
  const appliedDeals: AppliedDeal[] = [];
  const dealProgress: DealProgress[] = [];
  let dealDiscount = 0;
  let exclusiveApplied = false;

  for (const deal of candidates) {
    const current = deal.triggerType === 'subtotal_min' ? subtotal : eligibleItemCount;
    const target = Math.max(0, Number(deal.triggerValue) || 0);
    const met = target > 0 && current >= target;

    const configError = validateRewardConfig(deal);
    if (configError) {
      skipped.push({ dealId: deal.id, reason: 'reward_misconfigured', detail: configError });
      continue;
    }

    const gift = deal.rewardType === 'FREE_GIFT' ? giftCatalog[deal.id] : undefined;
    if (deal.rewardType === 'FREE_GIFT') {
      const giftProblem = giftProblemFor(deal, gift);
      if (giftProblem) {
        // Silently drop the deal rather than promise a gift we cannot ship.
        skipped.push({ dealId: deal.id, ...giftProblem });
        continue;
      }
    }

    // 4. An exclusive deal that has already applied closes the cart to any
    //    further cart-settled deal. Delivered rewards are unaffected — they
    //    settle on a different ledger and never change what is paid today.
    const suppressed = deal.settleOn === 'cart' && exclusiveApplied;
    if (suppressed) continue;

    const values = copyValuesFor(deal, {
      remaining: Math.max(0, target - current),
      gift,
      formatMoney,
    });

    dealProgress.push({
      deal_id: deal.id,
      reward_type: deal.rewardType,
      settle_on: deal.settleOn,
      unlocked: met,
      current: round2(current),
      target: round2(target),
      percent: target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0,
      remaining: round2(Math.max(0, target - current)),
      message: interpolateCopy(met ? deal.storefrontCopy.unlocked : deal.storefrontCopy.locked, values),
      reward_preview: {
        label: interpolateCopy(deal.storefrontCopy.badge, values),
        image: gift?.image ?? null,
      },
      reward_detail: rewardDetailFor(deal, gift, current),
    });

    if (!met || deal.settleOn !== 'cart') continue;

    if (deal.rewardType === 'FIXED_DISCOUNT') {
      const config = deal.rewardConfig as FixedDiscountConfig;
      // Never discount past the eligible subtotal — a stacked pair of deals
      // must not push the cart negative.
      const amount = Math.max(0, Math.min(config.amount, subtotal - dealDiscount));
      if (amount > 0) {
        dealDiscount += amount;
        appliedDeals.push(applied(deal, amount, { amount }));
      }
    } else if (deal.rewardType === 'FREE_GIFT' && gift) {
      const config = deal.rewardConfig as FreeGiftConfig;
      const qty = Math.max(1, Math.floor(config.qty) || 1);
      lines.push({
        id: gift.productId,
        variant: gift.variantLabel,
        name: gift.name,
        price: 0,
        quantity: qty,
        image: gift.image,
        maxQuantity: qty,
        isGift: true,
        lockedQty: true,
        sourceDealId: deal.id,
        // The cart strikes this through beside the zero, so what the gift is
        // worth stays visible.
        listPrice: gift.price,
        excludedFromPromotions: true,
      });
      appliedDeals.push(
        applied(deal, 0, {
          productId: gift.productId,
          variantId: gift.variantId ?? null,
          name: gift.name,
          qty,
          /** Struck-through price shown next to the gift line. */
          listPrice: gift.price,
        })
      );
    }

    if (deal.isExclusive) exclusiveApplied = true;
  }

  return {
    lines,
    subtotal: round2(subtotal),
    cartTotal: round2(cartTotal),
    dealDiscount: round2(dealDiscount),
    appliedDeals,
    dealProgress,
    skipped,
  };
}

/**
 * The delivered-settled half of the same pass. Order creation needs to know
 * which points and punch-card grants an order has earned, and that decision is
 * exactly the trigger check the cart already ran — so it is derived from the
 * engine's own progress list rather than reimplemented.
 */
export function pendingRewardsFor(result: RecalculateResult, deals: DealDefinition[]): AppliedDeal[] {
  const byId = new Map(deals.map((deal) => [deal.id, deal]));
  const earned: AppliedDeal[] = [];

  for (const progress of result.dealProgress) {
    if (progress.settle_on !== 'delivered' || !progress.unlocked) continue;
    const deal = byId.get(progress.deal_id);
    if (!deal) continue;

    if (deal.rewardType === 'LOYALTY_POINTS') {
      const config = deal.rewardConfig as LoyaltyPointsConfig;
      earned.push(
        applied(deal, 0, {
          points: config.points,
          minClaimThreshold: config.minClaimThreshold,
          expiresAfterDays: config.expiresAfterDays,
        })
      );
    } else if (deal.rewardType === 'PUNCH_CARD') {
      const config = deal.rewardConfig as PunchCardConfig;
      earned.push(
        applied(deal, 0, {
          punches: 1,
          targetCount: config.targetCount,
          repeatable: config.repeatable,
          boxPool: config.boxPool,
        })
      );
    }
  }

  return earned;
}

/* ── Internals ───────────────────────────────────────────────────────── */

function sumLines(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.price * line.quantity, 0);
}

function applied(
  deal: DealDefinition,
  discountAmount: number,
  snapshot: Record<string, unknown>
): AppliedDeal {
  return {
    dealId: deal.id,
    name: deal.name,
    rewardType: deal.rewardType,
    settleOn: deal.settleOn,
    discountAmount: round2(discountAmount),
    // Snapshot the deal as it stands now. Historical orders must never be
    // re-read against a live deal row that has since been edited.
    rewardSnapshot: {
      ...snapshot,
      dealName: deal.name,
      triggerType: deal.triggerType,
      triggerValue: deal.triggerValue,
      storefrontCopy: { ...deal.storefrontCopy },
    },
  };
}

function audienceMatches(deal: DealDefinition, customer?: CustomerContext): boolean {
  if (deal.audience === 'all') return true;
  // A guest cannot be held to a per-person promise, so targeted deals need a
  // signed-in customer.
  if (!customer?.id) return false;
  if (deal.audience === 'new_customers') return customer.isNewCustomer === true;
  if (deal.audience === 'customer_group') {
    if (!deal.audienceGroupId) return false;
    return (customer.groupIds || []).includes(deal.audienceGroupId);
  }
  return false;
}

function withinPerCustomerLimit(deal: DealDefinition, customer?: CustomerContext): boolean {
  if (!deal.usageLimitPerCustomer) return true;
  if (!customer?.id) return true;
  const used = customer.usageByDeal?.[deal.id] ?? 0;
  return used < deal.usageLimitPerCustomer;
}

function giftProblemFor(
  deal: DealDefinition,
  gift: GiftCandidate | undefined
): Pick<SkipNotice, 'reason' | 'detail'> | null {
  if (!gift) {
    return { reason: 'gift_missing', detail: `Gift product for "${deal.name}" no longer exists` };
  }
  if (!gift.giftable) {
    return { reason: 'gift_not_giftable', detail: `${gift.name} is not marked giftable` };
  }
  if (!gift.inStock) {
    return { reason: 'gift_out_of_stock', detail: `${gift.name} is out of stock` };
  }
  return null;
}

function copyValuesFor(
  deal: DealDefinition,
  context: { remaining: number; gift?: GiftCandidate; formatMoney: (value: number) => string }
): CopyValues {
  const values: CopyValues = {
    remaining:
      deal.triggerType === 'subtotal_min'
        ? context.formatMoney(context.remaining)
        : String(Math.ceil(context.remaining)),
  };
  if (deal.rewardType === 'LOYALTY_POINTS') {
    values.points = String((deal.rewardConfig as LoyaltyPointsConfig).points ?? 0);
  }
  if (context.gift) values.gift = context.gift.name;
  values.reward = rewardValueFor(deal, values, context);
  return values;
}

/**
 * What `{reward}` stands for — the reward's own value rather than its label:
 * the money off, the gift's name, the points, and for a punch card the name of
 * the box, which is what the badge copy already holds. The badge is
 * interpolated without `{reward}` in scope so the two cannot chase each other.
 */
function rewardValueFor(
  deal: DealDefinition,
  values: CopyValues,
  context: { gift?: GiftCandidate; formatMoney: (value: number) => string }
): string {
  switch (deal.rewardType) {
    case 'FIXED_DISCOUNT':
      return context.formatMoney(Number((deal.rewardConfig as FixedDiscountConfig).amount) || 0);
    case 'FREE_GIFT':
      return context.gift?.name ?? '';
    case 'LOYALTY_POINTS':
      return `${values.points ?? '0'} points`;
    case 'PUNCH_CARD':
      return interpolateCopy(deal.storefrontCopy.badge, { ...values, reward: undefined });
    default:
      return '';
  }
}

/**
 * The reward's figures, typed per reward type. The cart renders a discount
 * row, a gift line, a points card and a stamp strip from these rather than
 * parsing the admin's copy.
 */
function rewardDetailFor(
  deal: DealDefinition,
  gift: GiftCandidate | undefined,
  current: number
): RewardDetail {
  switch (deal.rewardType) {
    case 'FIXED_DISCOUNT':
      return {
        discount_amount: round2(Number((deal.rewardConfig as FixedDiscountConfig).amount) || 0),
      };
    case 'FREE_GIFT': {
      const config = deal.rewardConfig as FreeGiftConfig;
      return {
        gift_name: gift?.name,
        gift_qty: Math.max(1, Math.floor(Number(config.qty)) || 1),
        gift_list_price: gift ? round2(gift.price) : undefined,
      };
    }
    case 'LOYALTY_POINTS': {
      const config = deal.rewardConfig as LoyaltyPointsConfig;
      return {
        points: Math.max(0, Math.floor(Number(config.points)) || 0),
        min_claim_threshold: Math.max(0, Math.floor(Number(config.minClaimThreshold)) || 0),
      };
    }
    case 'PUNCH_CARD': {
      const config = deal.rewardConfig as PunchCardConfig;
      const target = Math.max(1, Math.floor(Number(config.targetCount)) || 1);
      return {
        stamp_target: target,
        // Stamps this cart fills, never more than the card holds.
        stamps_filled: Math.min(target, Math.max(0, Math.floor(current))),
      };
    }
    default:
      return {};
  }
}

function validateRewardConfig(deal: DealDefinition): string | null {
  const config = deal.rewardConfig as unknown as Record<string, unknown>;
  if (!config) return `"${deal.name}" has no reward configuration`;

  switch (deal.rewardType) {
    case 'FIXED_DISCOUNT':
      return Number(config.amount) > 0 ? null : `"${deal.name}" has a non-positive discount`;
    case 'FREE_GIFT':
      return config.productId ? null : `"${deal.name}" has no gift product`;
    case 'LOYALTY_POINTS':
      return Number(config.points) > 0 ? null : `"${deal.name}" awards no points`;
    case 'PUNCH_CARD':
      return Number(config.targetCount) > 0 ? null : `"${deal.name}" has no punch target`;
    default:
      return `"${deal.name}" has an unknown reward type`;
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
