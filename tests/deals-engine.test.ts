import assert from 'node:assert/strict';
import test from 'node:test';

import { recalculateCart } from '../lib/deals/engine.ts';
import { interpolateCopy } from '../lib/deals/copy.ts';
import { dealStatus } from '../lib/deals/status.ts';
import { summarizeDeal } from '../lib/deals/summary.ts';
import type {
  CartLine,
  DealDefinition,
  GiftCandidate,
} from '../lib/deals/types.ts';

const NOW = new Date('2026-09-15T12:00:00Z');

function deal(overrides: Partial<DealDefinition> = {}): DealDefinition {
  return {
    id: 'deal-1',
    name: 'Spend and save',
    isActive: true,
    priority: 10,
    isExclusive: false,
    startsAt: new Date('2026-09-01T00:00:00Z'),
    endsAt: new Date('2026-09-30T23:59:59Z'),
    audience: 'all',
    triggerType: 'subtotal_min',
    triggerValue: 2000,
    rewardType: 'FIXED_DISCOUNT',
    settleOn: 'cart',
    rewardConfig: { amount: 300 },
    usedCount: 0,
    storefrontCopy: {
      locked: 'Add {remaining} more to save',
      unlocked: 'Discount applied',
      badge: '300 off',
    },
    ...overrides,
  } as DealDefinition;
}

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: '000000000000000000000001',
    name: 'Leather tote',
    price: 1000,
    quantity: 1,
    ...overrides,
  };
}

const GIFT: GiftCandidate = {
  productId: '000000000000000000000099',
  variantId: null,
  name: 'Card holder',
  price: 450,
  image: '/gift.jpg',
  inStock: true,
  giftable: true,
};

function run(lines: CartLine[], deals: DealDefinition[], extra: Record<string, any> = {}) {
  return recalculateCart({
    lines,
    deals,
    now: NOW,
    formatMoney: (value) => `E${Math.round(value)}`,
    ...extra,
  });
}

/* ── Threshold crossing ──────────────────────────────────────────────── */

test('a cart below the threshold reports progress and applies nothing', () => {
  const result = run([line({ price: 1680 })], [deal()]);

  assert.equal(result.dealDiscount, 0);
  assert.equal(result.appliedDeals.length, 0);

  const [progress] = result.dealProgress;
  assert.equal(progress.unlocked, false);
  assert.equal(progress.current, 1680);
  assert.equal(progress.target, 2000);
  assert.equal(progress.percent, 84);
  assert.equal(progress.remaining, 320);
  assert.equal(progress.message, 'Add E320 more to save');
  assert.equal(progress.reward_preview.label, '300 off');
});

test('crossing the threshold applies the discount and flips the message', () => {
  const result = run([line({ price: 2000 })], [deal()]);

  assert.equal(result.dealDiscount, 300);
  assert.equal(result.appliedDeals[0].dealId, 'deal-1');
  assert.equal(result.dealProgress[0].unlocked, true);
  assert.equal(result.dealProgress[0].percent, 100);
  assert.equal(result.dealProgress[0].message, 'Discount applied');
});

test('dropping back below the threshold withdraws the reward and the gift line', () => {
  const gifting = deal({ rewardType: 'FREE_GIFT', rewardConfig: { productId: GIFT.productId, qty: 1 } });
  const unlocked = run([line({ price: 2000 })], [gifting], { giftCatalog: { 'deal-1': GIFT } });
  assert.equal(unlocked.lines.filter((entry) => entry.isGift).length, 1);

  // The cart is rebuilt from the customer's own lines, and the stale gift line
  // is handed back in — exactly what a client would send after a quantity drop.
  const relocked = run(unlocked.lines.map((entry) => ({ ...entry, price: entry.isGift ? 0 : 1500 })), [gifting], {
    giftCatalog: { 'deal-1': GIFT },
  });

  assert.equal(relocked.lines.filter((entry) => entry.isGift).length, 0);
  assert.equal(relocked.dealProgress[0].unlocked, false);
  assert.equal(relocked.dealProgress[0].remaining, 500);
});

test('a gift line never counts toward the trigger that created it', () => {
  const gifting = deal({
    triggerValue: 2000,
    rewardType: 'FREE_GIFT',
    rewardConfig: { productId: GIFT.productId, qty: 1 },
  });
  // A gift priced at its list value would otherwise push a 1,600 cart over.
  const result = run(
    [line({ price: 1600 }), line({ id: GIFT.productId, price: 450, isGift: true })],
    [gifting],
    { giftCatalog: { 'deal-1': GIFT } }
  );

  assert.equal(result.subtotal, 1600);
  assert.equal(result.dealProgress[0].unlocked, false);
});

test('products excluded from promotions do not count toward a trigger', () => {
  const result = run(
    [line({ price: 1500 }), line({ id: '000000000000000000000002', price: 800, excludedFromPromotions: true })],
    [deal()]
  );

  assert.equal(result.subtotal, 1500);
  assert.equal(result.cartTotal, 2300);
  assert.equal(result.dealProgress[0].unlocked, false);
});

/* ── Gifts ───────────────────────────────────────────────────────────── */

test('an out-of-stock gift is skipped silently rather than promised', () => {
  const gifting = deal({ rewardType: 'FREE_GIFT', rewardConfig: { productId: GIFT.productId, qty: 1 } });
  const result = run([line({ price: 3000 })], [gifting], {
    giftCatalog: { 'deal-1': { ...GIFT, inStock: false } },
  });

  assert.equal(result.lines.filter((entry) => entry.isGift).length, 0);
  // No progress row either: a customer must not be shown a reward we cannot ship.
  assert.deepEqual(result.dealProgress, []);
  assert.equal(result.skipped[0].reason, 'gift_out_of_stock');
});

test('a gift product that is no longer giftable is skipped', () => {
  const gifting = deal({ rewardType: 'FREE_GIFT', rewardConfig: { productId: GIFT.productId, qty: 1 } });
  const result = run([line({ price: 3000 })], [gifting], {
    giftCatalog: { 'deal-1': { ...GIFT, giftable: false } },
  });

  assert.equal(result.skipped[0].reason, 'gift_not_giftable');
});

test('an unlocked gift is injected at price 0, locked, and attributed to its deal', () => {
  const gifting = deal({ rewardType: 'FREE_GIFT', rewardConfig: { productId: GIFT.productId, qty: 2 } });
  const result = run([line({ price: 2500 })], [gifting], { giftCatalog: { 'deal-1': GIFT } });

  const gift = result.lines.find((entry) => entry.isGift);
  assert.ok(gift);
  assert.equal(gift.price, 0);
  assert.equal(gift.quantity, 2);
  assert.equal(gift.lockedQty, true);
  assert.equal(gift.sourceDealId, 'deal-1');
  // The line itself carries what the gift is worth, so the cart can strike it
  // through beside the zero without consulting the applied-deal snapshot.
  assert.equal(gift.listPrice, 450);
  assert.equal(result.appliedDeals[0].rewardSnapshot.listPrice, 450);
});

/* ── Priority and exclusivity ────────────────────────────────────────── */

test('deals apply in priority order and an exclusive deal stops the rest', () => {
  const first = deal({ id: 'a', priority: 10, isExclusive: true, rewardConfig: { amount: 300 } });
  const second = deal({ id: 'b', priority: 20, rewardConfig: { amount: 100 } });

  const result = run([line({ price: 5000 })], [second, first]);

  assert.equal(result.dealDiscount, 300);
  assert.deepEqual(result.appliedDeals.map((entry) => entry.dealId), ['a']);
  // The suppressed deal is not shown as progress either — it cannot unlock.
  assert.deepEqual(result.dealProgress.map((entry) => entry.deal_id), ['a']);
});

test('non-exclusive deals stack, capped at the eligible subtotal', () => {
  const first = deal({ id: 'a', priority: 10, triggerValue: 500, rewardConfig: { amount: 400 } });
  const second = deal({ id: 'b', priority: 20, triggerValue: 500, rewardConfig: { amount: 400 } });

  const result = run([line({ price: 600 })], [first, second]);

  assert.equal(result.dealDiscount, 600);
});

test('an exclusive cart deal does not suppress a delivered-settled reward', () => {
  const exclusive = deal({ id: 'a', priority: 10, isExclusive: true });
  const points = deal({
    id: 'b',
    priority: 20,
    rewardType: 'LOYALTY_POINTS',
    settleOn: 'delivered',
    rewardConfig: { points: 150, minClaimThreshold: 500, expiresAfterDays: 365 },
    storefrontCopy: { locked: 'Add {remaining}', unlocked: 'Earn {points} points', badge: '{points} points' },
  });

  const result = run([line({ price: 5000 })], [exclusive, points]);

  assert.deepEqual(result.dealProgress.map((entry) => entry.deal_id), ['a', 'b']);
  assert.equal(result.dealProgress[1].message, 'Earn 150 points');
});

/* ── Window, audience and limits ─────────────────────────────────────── */

test('a deal outside its window never applies', () => {
  const expired = deal({ endsAt: new Date('2026-09-01T00:00:00Z') });
  const scheduled = deal({ id: 'later', startsAt: new Date('2026-10-01T00:00:00Z'), endsAt: new Date('2026-10-31T00:00:00Z') });
  const paused = deal({ id: 'paused', isActive: false });

  for (const candidate of [expired, scheduled, paused]) {
    const result = run([line({ price: 5000 })], [candidate]);
    assert.deepEqual(result.dealProgress, [], candidate.id);
    assert.equal(result.dealDiscount, 0);
  }

  assert.equal(dealStatus(expired, NOW), 'expired');
  assert.equal(dealStatus(scheduled, NOW), 'scheduled');
  assert.equal(dealStatus(paused, NOW), 'paused');
  assert.equal(dealStatus(deal(), NOW), 'live');
  assert.equal(dealStatus(deal({ usageLimit: 5, usedCount: 5 }), NOW), 'exhausted');
});

test('a deal at its total usage limit stops applying', () => {
  const result = run([line({ price: 5000 })], [deal({ usageLimit: 10, usedCount: 10 })]);
  assert.equal(result.dealDiscount, 0);
});

test('the per-customer cap only binds a signed-in customer', () => {
  const capped = deal({ usageLimitPerCustomer: 1 });

  const guest = run([line({ price: 5000 })], [capped]);
  assert.equal(guest.dealDiscount, 300);

  const spent = run([line({ price: 5000 })], [capped], {
    customer: { id: 'cust-1', usageByDeal: { 'deal-1': 1 } },
  });
  assert.equal(spent.dealDiscount, 0);
});

test('a new-customer deal skips guests and returning customers', () => {
  const targeted = deal({ audience: 'new_customers' });

  assert.equal(run([line({ price: 5000 })], [targeted]).dealDiscount, 0);
  assert.equal(
    run([line({ price: 5000 })], [targeted], { customer: { id: 'c', isNewCustomer: false } }).dealDiscount,
    0
  );
  assert.equal(
    run([line({ price: 5000 })], [targeted], { customer: { id: 'c', isNewCustomer: true } }).dealDiscount,
    300
  );
});

test('a group deal needs the customer to carry that group', () => {
  const targeted = deal({ audience: 'customer_group', audienceGroupId: 'vip' });

  assert.equal(
    run([line({ price: 5000 })], [targeted], { customer: { id: 'c', groupIds: ['press'] } }).dealDiscount,
    0
  );
  assert.equal(
    run([line({ price: 5000 })], [targeted], { customer: { id: 'c', groupIds: ['vip'] } }).dealDiscount,
    300
  );
});

/* ── Item-count triggers ─────────────────────────────────────────────── */

test('an item-count trigger counts quantities, not lines', () => {
  const stamping = deal({
    rewardType: 'PUNCH_CARD',
    settleOn: 'delivered',
    triggerType: 'item_count_min',
    triggerValue: 5,
    rewardConfig: { targetCount: 10, boxPool: [{ productId: 'x', weight: 1 }], repeatable: true },
    storefrontCopy: { locked: '{remaining} more items', unlocked: 'Stamp earned', badge: 'Stamp' },
  });

  const short = run([line({ quantity: 3 })], [stamping]);
  assert.equal(short.dealProgress[0].current, 3);
  assert.equal(short.dealProgress[0].message, '2 more items');

  const met = run([line({ quantity: 5 })], [stamping]);
  assert.equal(met.dealProgress[0].unlocked, true);
});

/* ── Misconfiguration ────────────────────────────────────────────────── */

test('a misconfigured reward is skipped rather than applied as zero', () => {
  const broken = deal({ rewardConfig: { amount: 0 } });
  const result = run([line({ price: 5000 })], [broken]);

  assert.deepEqual(result.dealProgress, []);
  assert.equal(result.skipped[0].reason, 'reward_misconfigured');
});

/* ── Copy ────────────────────────────────────────────────────────────── */

test('copy interpolation fills known placeholders and leaves the rest alone', () => {
  assert.equal(
    interpolateCopy('Add {remaining} for {gift}', { remaining: 'E320', gift: 'a card holder' }),
    'Add E320 for a card holder'
  );
  // An unsupplied placeholder stays visible rather than rendering "undefined".
  assert.equal(interpolateCopy('Earn {points} points', {}), 'Earn {points} points');
  assert.equal(interpolateCopy('Save {amount}', { remaining: 'E10' }), 'Save {amount}');
});

test('a deal summarises as a sentence', () => {
  assert.equal(
    summarizeDeal(deal(), {
      formatMoney: (value) => `E${value}`,
      formatDate: (date) => date.toISOString().slice(0, 10),
      now: NOW,
    }),
    'When cart subtotal reaches E2000, give E300 off. Live 2026-09-01 - 2026-09-30.'
  );

  assert.match(
    summarizeDeal(deal({ isExclusive: true }), { now: NOW }),
    /runs on its own/
  );
});

/* ── Reward detail ───────────────────────────────────────────────────── */

test('reward_detail carries the figures the cart renders each type from', () => {
  const discount = run([line({ price: 1000 })], [deal()]).dealProgress[0].reward_detail;
  assert.deepEqual(discount, { discount_amount: 300 });

  const gifting = deal({
    rewardType: 'FREE_GIFT',
    rewardConfig: { productId: GIFT.productId, qty: 2 },
  });
  const gift = run([line({ price: 1000 })], [gifting], {
    giftCatalog: { 'deal-1': GIFT },
  }).dealProgress[0].reward_detail;
  // Known before the threshold too, so a locked card can name what is coming.
  assert.deepEqual(gift, { gift_name: 'Card holder', gift_qty: 2, gift_list_price: 450 });

  const points = run(
    [line({ price: 1000 })],
    [
      deal({
        rewardType: 'LOYALTY_POINTS',
        settleOn: 'delivered',
        rewardConfig: { points: 150, minClaimThreshold: 500, expiresAfterDays: 365 },
      }),
    ]
  ).dealProgress[0].reward_detail;
  assert.deepEqual(points, { points: 150, min_claim_threshold: 500 });

  const punch = run(
    [line({ price: 100, quantity: 7 })],
    [
      deal({
        rewardType: 'PUNCH_CARD',
        settleOn: 'delivered',
        triggerType: 'item_count_min',
        triggerValue: 10,
        rewardConfig: { targetCount: 10, boxPool: [], repeatable: true },
      }),
    ]
  ).dealProgress[0].reward_detail;
  assert.deepEqual(punch, { stamp_target: 10, stamps_filled: 7 });
});

test('stamps never exceed the slots the card has', () => {
  const card = deal({
    rewardType: 'PUNCH_CARD',
    settleOn: 'delivered',
    triggerType: 'item_count_min',
    triggerValue: 10,
    rewardConfig: { targetCount: 10, boxPool: [], repeatable: true },
  });
  const progress = run([line({ price: 100, quantity: 14 })], [card]).dealProgress[0];

  assert.equal(progress.unlocked, true);
  assert.equal(progress.reward_detail.stamps_filled, 10);
  assert.equal(progress.percent, 100);
});

test('{reward} resolves to each reward type\'s own value', () => {
  const locked = (overrides: Partial<DealDefinition>, extra: Record<string, any> = {}) =>
    run(
      [line({ price: 100 })],
      [
        deal({
          storefrontCopy: { locked: 'Add {remaining} more to save {reward}', unlocked: 'x', badge: 'Mystery Box' },
          ...overrides,
        }),
      ],
      extra
    ).dealProgress[0].message;

  assert.equal(locked({}), 'Add E1900 more to save E300');
  assert.equal(
    locked(
      { rewardType: 'FREE_GIFT', rewardConfig: { productId: GIFT.productId, qty: 1 } },
      { giftCatalog: { 'deal-1': GIFT } }
    ),
    'Add E1900 more to save Card holder'
  );
  assert.equal(
    locked({
      rewardType: 'LOYALTY_POINTS',
      settleOn: 'delivered',
      rewardConfig: { points: 150, minClaimThreshold: 500, expiresAfterDays: 365 },
    }),
    'Add E1900 more to save 150 points'
  );
  // A punch card's reward is the box, whose name is the badge copy — and the
  // badge cannot recurse into itself.
  assert.equal(
    locked({
      rewardType: 'PUNCH_CARD',
      settleOn: 'delivered',
      triggerType: 'item_count_min',
      triggerValue: 10,
      rewardConfig: { targetCount: 10, boxPool: [], repeatable: true },
    }),
    'Add 9 more to save Mystery Box'
  );
});
