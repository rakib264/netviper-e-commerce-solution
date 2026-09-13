import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  minSpend?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  currentUsage: number;
  isActive: boolean;
  startDate: Date;
  expiryDate: Date;
  createdBy?: mongoose.Types.ObjectId;
  applicableCategories?: mongoose.Types.ObjectId[];
  applicableProducts?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
 
const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ['fixed', 'percentage'], required: true },
  value: { type: Number, required: true },
  minSpend: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  usageLimit: { type: Number },
  usageLimitPerCustomer: { type: Number, default: 1 },
  currentUsage: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
} as unknown as Record<keyof Omit<ICoupon, 'createdAt' | 'updatedAt' | 'id'>, any>, { timestamps: true });

/**
 * The only non-`code` lookup in the codebase: the dashboard's active-coupon
 * count and list (`isActive` + an `expiryDate` range). `code` is `unique`, so
 * the validate and checkout paths are already served by its implicit index;
 * this collection had no other index at all, and that query was a full scan.
 */
CouponSchema.index({ isActive: 1, expiryDate: 1 });

export default mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);