import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateComboBundles } from '@/lib/cache/revalidate';
import mongoose, { Document, Schema } from 'mongoose';

import {
  MAX_COMPONENT_QTY,
  MAX_COMPONENTS,
  type ComboType,
} from '@/lib/combo-bundles/types';

export interface IComboComponent {
  product: mongoose.Types.ObjectId;
  /** Variant id within the product, when the component is a specific variant. */
  variantId?: string;
  qty: number;
  sortOrder: number;
}

export interface IComboBundle extends Document {
  name: string;
  slug: string;
  description: string;
  images: string[];
  /** Derived from `components.length` on every write — never set by hand. */
  comboType: ComboType;
  components: IComboComponent[];
  price: number;
  /** 0 means "sum the component list prices at read time". */
  compareAtPrice: number;
  badgeText: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ComboComponentSchema = new Schema<IComboComponent>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String, trim: true, default: '' },
    qty: { type: Number, default: 1, min: 1, max: MAX_COMPONENT_QTY },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const ComboBundleSchema = new Schema<IComboBundle>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    images: [{ type: String, trim: true }],
    comboType: { type: String, enum: ['combo', 'bundle'], default: 'combo' },
    components: {
      type: [ComboComponentSchema],
      default: [],
      validate: {
        // The floor is the product rule, not a nicety: one product is a
        // product, and this entity only exists to sell several as one unit.
        validator: (value: IComboComponent[]) =>
          Array.isArray(value) && value.length >= 2 && value.length <= MAX_COMPONENTS,
        message: 'A combo or bundle needs between 2 and 12 products',
      },
    },
    // The fixed price the customer pays. Component prices are only ever used
    // to show what the offer saves.
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0, min: 0 },
    badgeText: { type: String, trim: true, default: '', maxlength: 40 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Keep `comboType` in step with the composition.
 *
 * Stored rather than computed on read so lists can filter and sort on it, but
 * written here so it can never disagree with `components` — including on a
 * partial update that only touches the component list.
 */
function syncComboType(this: IComboBundle) {
  this.comboType = (this.components?.length || 0) >= 3 ? 'bundle' : 'combo';
}

ComboBundleSchema.pre('validate', syncComboType);

ComboBundleSchema.index({ isActive: 1, sortOrder: 1 });
ComboBundleSchema.index({ isActive: 1, isFeatured: -1, sortOrder: 1 });
ComboBundleSchema.index({ 'components.product': 1 });

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(ComboBundleSchema, revalidateComboBundles);

const ComboBundleModel =
  (mongoose.models?.ComboBundle as mongoose.Model<IComboBundle> | undefined) ||
  mongoose.model<IComboBundle>('ComboBundle', ComboBundleSchema);

export default ComboBundleModel;
