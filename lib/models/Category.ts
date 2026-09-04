import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateCategories } from '@/lib/cache/revalidate';
import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parent?: mongoose.Types.ObjectId;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  parent: { type: Schema.Types.ObjectId, ref: 'Category' },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  metaTitle: { type: String },
  metaDescription: { type: String }
}, {
  timestamps: true
});

/*
 * Indexes for the category tree.
 *
 * `slug` already carries a unique index from its field definition. These cover
 * the two shapes every storefront read uses: the whole active tree in display
 * order, and one node's direct children.
 */
CategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });
CategorySchema.index({ parent: 1, isActive: 1 });

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(CategorySchema, revalidateCategories);

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);