import { LEDGER_ENTRY_TYPES, LEDGER_STATUSES, type LedgerEntryType, type LedgerStatus } from '@/lib/deals/rewards';
import mongoose, { Document, Schema } from 'mongoose';

/**
 * Append-only points ledger.
 *
 * Rows are never deleted or edited in place except for the pending → available
 * flip at delivery. A refund is a negative compensating row, so the history
 * always explains the balance.
 *
 * Balance rule (see `lib/deals/rewards.ts#computeBalances`):
 *   pending   = sum of rows with status `pending`
 *   available = sum of every other row
 */
export interface IPointsLedger extends Document {
  customer: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId | null;
  deal?: mongoose.Types.ObjectId | null;
  /** Signed: grants positive, redemptions/reversals/expiries negative. */
  points: number;
  balanceAfter: number;
  status: LedgerStatus;
  entryType: LedgerEntryType;
  expiresAt?: Date | null;
  availableAt?: Date | null;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PointsLedgerSchema = new Schema<IPointsLedger>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    deal: { type: Schema.Types.ObjectId, ref: 'Deal', default: null },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    status: { type: String, enum: LEDGER_STATUSES as unknown as string[], required: true },
    entryType: { type: String, enum: LEDGER_ENTRY_TYPES as unknown as string[], required: true },
    expiresAt: { type: Date, default: null },
    availableAt: { type: Date, default: null },
    note: { type: String },
  },
  { timestamps: true }
);

PointsLedgerSchema.index({ customer: 1, createdAt: -1 });
// One grant per deal per order — the database backstop behind the settlement
// claim, so a retried webhook cannot double-credit even under a race.
PointsLedgerSchema.index(
  { order: 1, deal: 1, entryType: 1 },
  { unique: true, partialFilterExpression: { order: { $type: 'objectId' } } }
);

export default mongoose.models.PointsLedger ||
  mongoose.model<IPointsLedger>('PointsLedger', PointsLedgerSchema);
