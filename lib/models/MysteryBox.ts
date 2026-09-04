import mongoose, { Document, Schema } from 'mongoose';

export const MYSTERY_BOX_STATUSES = ['pending', 'available', 'revealed'] as const;
export type MysteryBoxStatus = (typeof MYSTERY_BOX_STATUSES)[number];

/**
 * A box earned by filling a punch card. Created `pending` when the qualifying
 * order is paid, flipped to `available` when it is delivered, and `revealed`
 * once the customer opens it. The prize is drawn at reveal, not at creation,
 * so the pool an admin edits mid-campaign still applies.
 */
export interface IMysteryBox extends Document {
  customer: mongoose.Types.ObjectId;
  deal: mongoose.Types.ObjectId;
  punchCard: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId | null;
  status: MysteryBoxStatus;
  revealedProductId?: mongoose.Types.ObjectId | null;
  revealedVariantId?: string | null;
  revealedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MysteryBoxSchema = new Schema<IMysteryBox>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deal: { type: Schema.Types.ObjectId, ref: 'Deal', required: true },
    punchCard: { type: Schema.Types.ObjectId, ref: 'PunchCard', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    status: { type: String, enum: MYSTERY_BOX_STATUSES as unknown as string[], default: 'pending' },
    revealedProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    revealedVariantId: { type: String, default: null },
    revealedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MysteryBoxSchema.index({ customer: 1, status: 1 });
// A given order fills a card at most once, so it can award at most one box.
MysteryBoxSchema.index(
  { order: 1, deal: 1 },
  { unique: true, partialFilterExpression: { order: { $type: 'objectId' } } }
);

export default mongoose.models.MysteryBox ||
  mongoose.model<IMysteryBox>('MysteryBox', MysteryBoxSchema);
