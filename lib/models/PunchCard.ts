import mongoose, { Document, Schema } from 'mongoose';

/** One card per customer per punch-card deal. */
export interface IPunchCard extends Document {
  customer: mongoose.Types.ObjectId;
  deal: mongoose.Types.ObjectId;
  punches: number;
  target: number;
  completedCount: number;
  cardStartedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PunchCardSchema = new Schema<IPunchCard>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deal: { type: Schema.Types.ObjectId, ref: 'Deal', required: true },
    punches: { type: Number, default: 0 },
    target: { type: Number, required: true },
    completedCount: { type: Number, default: 0 },
    cardStartedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PunchCardSchema.index({ customer: 1, deal: 1 }, { unique: true });

export default mongoose.models.PunchCard ||
  mongoose.model<IPunchCard>('PunchCard', PunchCardSchema);
