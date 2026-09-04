/**
 * Seeds one running deal per reward type, so the cart's Deals section can be
 * exercised end to end.
 *
 * Idempotent: each deal is upserted on its name, and the product chosen as the
 * gift is flagged `giftable` because the engine refuses to promise a gift a
 * merchant has not marked as giftable.
 *
 *   node scripts/seed-deals.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const DAY = 24 * 60 * 60 * 1000;

/** Mongoose is only used as a driver here, so the schemas stay deliberately loose. */
const Deal = mongoose.model('Deal', new mongoose.Schema({}, { strict: false, collection: 'deals' }));
const Product = mongoose.model(
  'Product',
  new mongoose.Schema({}, { strict: false, collection: 'products' })
);
const HomepageSection = mongoose.model(
  'HomepageSection',
  new mongoose.Schema({}, { strict: false, collection: 'homepagesections' })
);

function databaseName(uri) {
  const match = /\/([^/?]+)(\?|$)/.exec(uri.replace(/^mongodb(\+srv)?:\/\//, ''));
  return match ? match[1] : 'myfood';
}

async function seedDeals() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not set');

  await mongoose.connect(uri, { dbName: databaseName(uri) });
  console.log(`Connected to ${mongoose.connection.db.databaseName}`);

  // Cheapest in-stock product becomes the gift; the rest make up the mystery
  // box pool. Picking from live data keeps the seed honest — a gift the
  // catalogue cannot ship is skipped by the engine, not shown as broken.
  const inStock = await Product.find({
    isActive: true,
    $or: [{ trackQuantity: false }, { quantity: { $gt: 0 } }],
  })
    .sort({ price: 1 })
    .lean();

  if (inStock.length === 0) throw new Error('No active, in-stock product to use as a gift');

  const gift = inStock[0];
  await Product.updateOne({ _id: gift._id }, { $set: { giftable: true } });
  console.log(`Gift product: ${gift.name} (${gift._id}) — marked giftable`);

  const boxPool = inStock.slice(0, 3).map((product, index) => ({
    productId: String(product._id),
    variantId: null,
    weight: [60, 30, 10][index] ?? 10,
  }));

  const now = new Date();
  const startsAt = new Date(now.getTime() - DAY);
  const endsAt = new Date(now.getTime() + 365 * DAY);

  const deals = [
    {
      name: 'Spend 2,000 and save 300',
      internalNote: 'Seeded: fixed discount',
      priority: 10,
      triggerType: 'subtotal_min',
      triggerValue: 2000,
      rewardType: 'FIXED_DISCOUNT',
      settleOn: 'cart',
      rewardConfig: { amount: 300 },
      storefrontCopy: {
        locked: 'Add {remaining} more to save {reward}',
        unlocked: 'Discount applied',
        badge: 'Discount',
      },
    },
    {
      name: 'Spend 2,000 for a free gift',
      internalNote: 'Seeded: free gift',
      priority: 20,
      triggerType: 'subtotal_min',
      triggerValue: 2000,
      rewardType: 'FREE_GIFT',
      settleOn: 'cart',
      rewardConfig: { productId: String(gift._id), variantId: null, qty: 1 },
      storefrontCopy: {
        locked: 'Add {remaining} more to get {gift} free',
        unlocked: '{gift} added to your cart, free',
        badge: 'Free gift',
      },
    },
    {
      name: 'Spend 2,000 and earn 150 points',
      internalNote: 'Seeded: loyalty points',
      priority: 30,
      triggerType: 'subtotal_min',
      triggerValue: 2000,
      rewardType: 'LOYALTY_POINTS',
      settleOn: 'delivered',
      rewardConfig: { points: 150, minClaimThreshold: 500, expiresAfterDays: 365 },
      storefrontCopy: {
        locked: 'Add {remaining} more to earn {points} points',
        unlocked: 'You will earn {points} points once this order is delivered',
        badge: '{points} points',
      },
    },
    {
      name: 'Collect 10 items for a Mystery Box',
      internalNote: 'Seeded: punch card',
      priority: 40,
      triggerType: 'item_count_min',
      triggerValue: 10,
      rewardType: 'PUNCH_CARD',
      settleOn: 'delivered',
      rewardConfig: { targetCount: 10, boxPool, repeatable: true },
      storefrontCopy: {
        locked: '{remaining} more items for a {reward}',
        unlocked: 'Your card is full — a {reward} is on its way',
        badge: 'Mystery Box',
      },
    },
  ];

  for (const deal of deals) {
    // `usedCount` is only set on insert so re-running the seed never rewinds a
    // deal's redemption count.
    const result = await Deal.updateOne(
      { name: deal.name },
      {
        $set: {
          ...deal,
          isActive: true,
          isExclusive: false,
          audience: 'all',
          audienceGroupId: null,
          startsAt,
          endsAt,
          usageLimit: null,
          usageLimitPerCustomer: null,
        },
        $setOnInsert: { usedCount: 0 },
      },
      { upsert: true }
    );
    const action = result.upsertedCount > 0 ? 'created' : 'updated';
    console.log(`${action}: ${deal.name} (${deal.rewardType})`);
  }

  console.log(`\nWindow: ${startsAt.toISOString()} -> ${endsAt.toISOString()}`);

  await placeStorefrontBand();
  await mongoose.disconnect();
}

/**
 * Puts the storefront's deals band directly below the hero.
 *
 * `sortOrder` lives in the database because position is admin-editable
 * (drag-to-reorder in Landing management), so the code default only applies to a
 * slot that has never been stored. A slot seeded before this script ran keeps
 * whatever order it was given, which is why this is set explicitly rather than
 * assumed.
 */
async function placeStorefrontBand() {
  const hero = await HomepageSection.findOne({ key: 'heroCarousel' }).lean();
  const heroOrder = Number(hero?.sortOrder) || 1;

  const result = await HomepageSection.updateOne(
    { key: 'activeDeals' },
    { $set: { sortOrder: heroOrder + 1, isEnabled: true } }
  );
  console.log(
    result.matchedCount > 0
      ? `Storefront band positioned at sortOrder ${heroOrder + 1} (below the hero)`
      : 'Storefront band not seeded yet — it will take the code default on first page load'
  );
}

seedDeals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed deals:', error.message);
    process.exit(1);
  });
