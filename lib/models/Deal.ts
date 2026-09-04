import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateDeals } from '@/lib/cache/revalidate';
import {
  DEAL_AUDIENCES,
  REWARD_TYPES,
  SETTLE_ON,
  TRIGGER_TYPES,
  type DealAudience,
  type RewardType,
  type SettleOn,
  type StorefrontCopy,
  type TriggerType,
} from '@/lib/deals/types';
import mongoose, { Document, Schema } from 'mongoose';

export interface IDeal extends Document {
  name: string;
  internalNote?: string;
  isActive: boolean;
  /** Lower runs first; drag-to-reorder in the admin list writes this. */
  priority: number;
  isExclusive: boolean;
  startsAt: Date;
  endsAt: Date;
  audience: DealAudience;
  audienceGroupId?: string | null;
  triggerType: TriggerType;
  triggerValue: number;
  rewardType: RewardType;
  settleOn: SettleOn;
  /** Shape depends on rewardType — see lib/deals/types.ts */
  rewardConfig: Record<string, any>;
  usageLimit?: number | null;
  usageLimitPerCustomer?: number | null;
  usedCount: number;
  storefrontCopy: StorefrontCopy;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StorefrontCopySchema = new Schema(
  {
    locked: { type: String, required: true },
    unlocked: { type: String, required: true },
    badge: { type: String, required: true },
  },
  { _id: false }
);

const DealSchema = new Schema<IDeal>(
  {
    name: { type: String, required: true, trim: true },
    internalNote: { type: String },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 100 },
    isExclusive: { type: Boolean, default: false },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    audience: { type: String, enum: DEAL_AUDIENCES as unknown as string[], default: 'all' },
    audienceGroupId: { type: String, default: null },
    triggerType: { type: String, enum: TRIGGER_TYPES as unknown as string[], required: true },
    triggerValue: { type: Number, required: true },
    rewardType: { type: String, enum: REWARD_TYPES as unknown as string[], required: true },
    settleOn: { type: String, enum: SETTLE_ON as unknown as string[], required: true },
    rewardConfig: { type: Schema.Types.Mixed, default: {} },
    usageLimit: { type: Number, default: null },
    usageLimitPerCustomer: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    storefrontCopy: { type: StorefrontCopySchema, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// The cart reads deals on every mutation, always filtered by the running
// window and ordered by priority.
DealSchema.index({ isActive: 1, startsAt: 1, endsAt: 1, priority: 1 });

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(DealSchema, revalidateDeals);

export default mongoose.models.Deal || mongoose.model<IDeal>('Deal', DealSchema);
