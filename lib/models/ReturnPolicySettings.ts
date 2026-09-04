import mongoose, { Schema } from 'mongoose';

import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateReturnPolicy } from '@/lib/cache/revalidate';
import type { ReturnPolicyContent } from '@/lib/returns/policy-content';

/**
 * Singleton holding the customer-facing returns policy.
 *
 * One document, like the other settings singletons. Text is stored per locale
 * rather than as a single string: the storefront serves three languages, and a
 * policy that only exists in English is not a policy the other two can rely on.
 *
 * `strict: false` on the text maps would let an admin add a locale the app does
 * not serve, so the shape is explicit and `readPolicyText` handles a locale an
 * admin has not filled in yet.
 */
export interface IReturnPolicySettings extends ReturnPolicyContent {
  createdAt: Date;
  updatedAt: Date;
}

const LocalizedTextSchema = new Schema(
  {
    en: { type: String, default: '', trim: true },
    bn: { type: String, default: '', trim: true },
    de: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const ReturnPolicySectionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: LocalizedTextSchema, default: () => ({}) },
    body: { type: LocalizedTextSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const ReturnPolicySettingsSchema = new Schema<IReturnPolicySettings>(
  {
    returnWindowDays: { type: Number, min: 1, max: 365, default: 14 },
    exchangeWindowDays: { type: Number, min: 1, max: 365, default: 14 },
    freeReturnShipping: { type: Boolean, default: true },
    sections: { type: [ReturnPolicySectionSchema], default: undefined },
  },
  { timestamps: true },
);

// A policy edit has to reach the storefront immediately; the customer-facing
// read is cached and tag-invalidated like every other settings read.
attachStorefrontInvalidation(ReturnPolicySettingsSchema, revalidateReturnPolicy);

export default mongoose.models.ReturnPolicySettings ||
  mongoose.model<IReturnPolicySettings>(
    'ReturnPolicySettings',
    ReturnPolicySettingsSchema,
  );
