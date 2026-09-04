import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponUsage extends Document {
  coupon: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  discountAmount: number;
  usedAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>({
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  discountAmount: { type: Number, required: true },
  usedAt: { type: Date, default: Date.now },
});

export default mongoose.models.CouponUsage || mongoose.model<ICouponUsage>('CouponUsage', CouponUsageSchema);