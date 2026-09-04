import {
  applyPunch,
  computeBalances,
  expiryFrom,
  reverseRow,
  revokePunch,
  type LedgerRow,
  type PointsBalances,
  type PunchCardState,
} from '@/lib/deals/rewards';
import MysteryBox from '@/lib/models/MysteryBox';
import OrderAppliedDeal, { type IOrderAppliedDeal } from '@/lib/models/OrderAppliedDeal';
import PointsLedger from '@/lib/models/PointsLedger';
import PunchCard from '@/lib/models/PunchCard';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

/**
 * The delivered-settled half of the deals engine.
 *
 * Every entry point is idempotent by claim: a row is taken with a conditional
 * update on its own timestamp, so a webhook that fires twice finds nothing
 * left to claim and does no work. The arithmetic itself lives in
 * `lib/deals/rewards.ts`, which has no database in it and is unit tested.
 */

export interface OrderLike {
  _id: mongoose.Types.ObjectId | string;
  customer?: mongoose.Types.ObjectId | string | null;
}

/**
 * Called on payment success. Grants loyalty points as `pending` and adds a
 * punch to the relevant card, creating a `pending` mystery box if that punch
 * fills it.
 */
export async function settleOrderRewards(order: OrderLike): Promise<void> {
  await connectDB();
  const orderId = String(order._id);
  const customerId = order.customer ? String(order.customer) : null;

  // A guest order cannot carry a wallet or a card. It is claimed anyway so a
  // retry does not keep re-examining it.
  const rows = await OrderAppliedDeal.find({
    order: orderId,
    settleOn: 'delivered',
    settledAt: null,
    reversedAt: null,
  });

  for (const row of rows) {
    const claimed = await OrderAppliedDeal.findOneAndUpdate(
      { _id: row._id, settledAt: null },
      { $set: { settledAt: new Date() } },
      { new: true }
    );
    // Another worker got there first.
    if (!claimed) continue;
    if (!customerId) continue;

    try {
      if (claimed.rewardType === 'LOYALTY_POINTS') {
        await grantPoints(claimed, customerId, orderId);
      } else if (claimed.rewardType === 'PUNCH_CARD') {
        await addPunch(claimed, customerId, orderId);
      }
    } catch (error) {
      // Release the claim so a later retry can settle it, rather than leaving
      // the customer silently short.
      await OrderAppliedDeal.updateOne({ _id: claimed._id }, { $set: { settledAt: null } });
      console.error('[deals] failed to settle reward', String(claimed._id), error);
    }
  }
}

/** Called when an order is marked delivered. Flips pending rewards to available. */
export async function releaseRewards(order: OrderLike): Promise<void> {
  await connectDB();
  const orderId = String(order._id);

  const rows = await OrderAppliedDeal.find({
    order: orderId,
    settleOn: 'delivered',
    settledAt: { $ne: null },
    releasedAt: null,
    reversedAt: null,
  });

  for (const row of rows) {
    const claimed = await OrderAppliedDeal.findOneAndUpdate(
      { _id: row._id, releasedAt: null },
      { $set: { releasedAt: new Date() } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      const now = new Date();
      await PointsLedger.updateMany(
        { order: orderId, deal: claimed.deal, status: 'pending' },
        { $set: { status: 'available', availableAt: now } }
      );
      await MysteryBox.updateMany(
        { order: orderId, deal: claimed.deal, status: 'pending' },
        { $set: { status: 'available' } }
      );
    } catch (error) {
      await OrderAppliedDeal.updateOne({ _id: claimed._id }, { $set: { releasedAt: null } });
      console.error('[deals] failed to release reward', String(claimed._id), error);
    }
  }
}

/**
 * Called on refund or cancellation. Writes a negative compensating row for
 * every grant and takes the punch back. Ledger rows are never deleted — the
 * history has to keep explaining the balance.
 */
export async function reverseOrderRewards(order: OrderLike, reason = 'Order reversed'): Promise<void> {
  await connectDB();
  const orderId = String(order._id);
  const customerId = order.customer ? String(order.customer) : null;

  const rows = await OrderAppliedDeal.find({
    order: orderId,
    settledAt: { $ne: null },
    reversedAt: null,
  });

  for (const row of rows) {
    const claimed = await OrderAppliedDeal.findOneAndUpdate(
      { _id: row._id, reversedAt: null },
      { $set: { reversedAt: new Date() } },
      { new: true }
    );
    if (!claimed) continue;
    if (!customerId) continue;

    try {
      if (claimed.rewardType === 'LOYALTY_POINTS') {
        await reversePoints(claimed, customerId, orderId, reason);
      } else if (claimed.rewardType === 'PUNCH_CARD') {
        await removePunch(claimed, customerId, orderId);
      }
    } catch (error) {
      await OrderAppliedDeal.updateOne({ _id: claimed._id }, { $set: { reversedAt: null } });
      console.error('[deals] failed to reverse reward', String(claimed._id), error);
    }
  }
}

/* ── Points ──────────────────────────────────────────────────────────── */

async function grantPoints(
  row: IOrderAppliedDeal,
  customerId: string,
  orderId: string
): Promise<void> {
  const snapshot = row.rewardSnapshot || {};
  const points = Number(snapshot.points) || 0;
  if (points <= 0) return;

  const now = new Date();
  const balances = await pointsBalances(customerId);

  await PointsLedger.create({
    customer: customerId,
    order: orderId,
    deal: row.deal,
    points,
    // Pending points are not spendable, so the running balance they report is
    // the available one they will join.
    balanceAfter: balances.available,
    status: 'pending',
    entryType: 'grant',
    expiresAt: expiryFrom(now, Number(snapshot.expiresAfterDays) || 365),
    availableAt: null,
    note: String(snapshot.dealName || ''),
  });
}

async function reversePoints(
  row: IOrderAppliedDeal,
  customerId: string,
  orderId: string,
  reason: string
): Promise<void> {
  const grants = await PointsLedger.find({ order: orderId, deal: row.deal, entryType: 'grant' });
  if (grants.length === 0) return;

  for (const grant of grants) {
    const compensating = reverseRow({ points: grant.points, status: grant.status } as LedgerRow);
    const balances = await pointsBalances(customerId);

    await PointsLedger.create({
      customer: customerId,
      // The reversal is deliberately not keyed to the order: the unique index
      // covers grants, and a second reversal is prevented by the claim on the
      // OrderAppliedDeal row.
      order: null,
      deal: row.deal,
      points: compensating.points,
      balanceAfter: balances.available + (compensating.status === 'pending' ? 0 : compensating.points),
      status: compensating.status,
      entryType: 'reversal',
      note: reason,
    });
  }
}

/** Current wallet position for a customer. */
export async function pointsBalances(customerId: string): Promise<PointsBalances> {
  await connectDB();
  const rows = await PointsLedger.find({ customer: customerId }).select('points status').lean();
  return computeBalances(rows as unknown as LedgerRow[]);
}

/**
 * Spends points. The threshold check lives in the route so the wallet can show
 * the shortfall; this writes the row.
 */
export async function redeemPoints(
  customerId: string,
  points: number,
  note: string
): Promise<void> {
  await connectDB();
  const balances = await pointsBalances(customerId);

  await PointsLedger.create({
    customer: customerId,
    points: -Math.abs(points),
    balanceAfter: balances.available - Math.abs(points),
    status: 'redeemed',
    entryType: 'redemption',
    note,
  });
}

/* ── Punch cards ─────────────────────────────────────────────────────── */

async function addPunch(
  row: IOrderAppliedDeal,
  customerId: string,
  orderId: string
): Promise<void> {
  const snapshot = row.rewardSnapshot || {};
  const target = Math.max(1, Number(snapshot.targetCount) || 1);
  const repeatable = snapshot.repeatable !== false;

  const card =
    (await PunchCard.findOne({ customer: customerId, deal: row.deal })) ||
    (await PunchCard.create({
      customer: customerId,
      deal: row.deal,
      punches: 0,
      target,
      completedCount: 0,
      cardStartedAt: new Date(),
    }));

  const state: PunchCardState = {
    punches: card.punches,
    // The snapshot's target wins: it is what the customer was promised.
    target,
    completedCount: card.completedCount,
  };
  const outcome = applyPunch(state, repeatable);

  card.punches = outcome.next.punches;
  card.target = outcome.next.target;
  if (outcome.boxAwarded) {
    card.completedCount = outcome.next.completedCount;
    card.cardStartedAt = new Date();
  }
  await card.save();

  if (!outcome.boxAwarded) return;

  await MysteryBox.updateOne(
    { order: orderId, deal: row.deal },
    {
      $setOnInsert: {
        customer: customerId,
        deal: row.deal,
        punchCard: card._id,
        order: orderId,
        status: 'pending',
      },
    },
    { upsert: true }
  );
}

async function removePunch(
  row: IOrderAppliedDeal,
  customerId: string,
  orderId: string
): Promise<void> {
  const card = await PunchCard.findOne({ customer: customerId, deal: row.deal });
  if (!card) return;

  const outcome = revokePunch({
    punches: card.punches,
    target: card.target,
    completedCount: card.completedCount,
  });

  card.punches = outcome.next.punches;
  card.completedCount = outcome.next.completedCount;
  await card.save();

  // An unopened box from this order goes with the punch that earned it. A box
  // already revealed is left alone — the prize has been given.
  await MysteryBox.deleteOne({
    order: orderId,
    deal: row.deal,
    status: { $in: ['pending', 'available'] },
  });
}

/* ── Transition rules ────────────────────────────────────────────────── */

/** Statuses that mean the order is real enough to earn its delivered rewards. */
const SETTLING_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

/**
 * The one place that decides which settlement step an order transition
 * triggers. Every caller — the gateway callbacks, both admin status routes —
 * goes through here, so a reward cannot be granted by one path and missed by
 * another.
 *
 * Safe to call on every update: each step is a no-op when there is nothing
 * left to claim.
 */
export async function syncOrderRewards(
  order: OrderLike & { orderStatus?: string; paymentStatus?: string }
): Promise<void> {
  try {
    const { orderStatus, paymentStatus } = order;

    if (paymentStatus === 'refunded' || orderStatus === 'cancelled') {
      await reverseOrderRewards(
        order,
        paymentStatus === 'refunded' ? 'Order refunded' : 'Order cancelled'
      );
      return;
    }

    // COD orders never pass through a gateway, so a confirmed order settles on
    // its status alone.
    if (paymentStatus === 'paid' || (orderStatus && SETTLING_STATUSES.includes(orderStatus))) {
      await settleOrderRewards(order);
    }

    if (orderStatus === 'delivered') {
      await releaseRewards(order);
    }
  } catch (error) {
    // Reward settlement must never break an order update — the claim
    // timestamps mean the next transition picks up whatever was missed.
    console.error('[deals] reward sync failed for order', String(order._id), error);
  }
}
