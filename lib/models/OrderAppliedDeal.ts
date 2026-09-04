import type { RewardType, SettleOn } from '@/lib/deals/types';
import mongoose, { Document, Schema } from 'mongoose';

/**
 * One row per deal that fired on an order, and the audit trail for its
 * settlement lifecycle.
 *
 * `rewardSnapshot` freezes the deal as it stood when the order was placed —
 * historical orders are never re-read against a live deal row, because an
 * admin editing a deal must not retroactively change what a customer was
 * promised.
 *
 * The three timestamps are also the idempotency keys. Settlement claims a row
 * with a conditional update (`settledAt: null` → now), so a retried webhook
 * finds nothing left to claim and does no work.
 */
export interface IOrderAppliedDeal extends Document {
  order: mongoose.Types.ObjectId;
  deal: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId | null;
  rewardType: RewardType;
  settleOn: SettleOn;
  rewardSnapshot: Record<string, any>;
  discountAmount: number;
  settledAt?: Date | null;
  releasedAt?: Date | null;
  reversedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderAppliedDealSchema = new Schema<IOrderAppliedDeal>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    deal: { type: Schema.Types.ObjectId, ref: 'Deal', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rewardType: { type: String, required: true },
    settleOn: { type: String, required: true },
    rewardSnapshot: { type: Schema.Types.Mixed, default: {} },
    discountAmount: { type: Number, default: 0 },
    settledAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    reversedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A deal applies to an order at most once — this is what makes a double
// webhook a no-op rather than a double grant.
OrderAppliedDealSchema.index({ order: 1, deal: 1 }, { unique: true });
OrderAppliedDealSchema.index({ customer: 1, deal: 1 });

export default mongoose.models.OrderAppliedDeal ||
  mongoose.model<IOrderAppliedDeal>('OrderAppliedDeal', OrderAppliedDealSchema);
