import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateProductShowcase } from '@/lib/cache/revalidate';
import mongoose, { Document, Schema } from 'mongoose';

export type IShowcaseTemplate = 'product_showcase' | 'split_media';
export type IShowcaseCardStyle = 'showcase' | 'luxury' | 'compact';
export type IShowcaseProductSource =
  | 'manual'
  | 'latest'
  | 'featured'
  | 'new-arrivals'
  | 'best-selling'
  | 'category';

export interface IShowcasePromo {
  image?: string;
  video?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface IShowcaseTab {
  id: string;
  title: string;
  value: string;
  promotion?: IShowcasePromo;
  productSource: IShowcaseProductSource;
  categorySlug?: string;
  productIds?: string[];
  limit?: number;
}

export interface ISplitPanel {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  posterImage?: string;
  title?: string;
  kicker?: string;
  ctaLabel?: string;
  ctaLink?: string;
  productId?: string;
}

export interface IProductShowcaseSection extends Document {
  template: IShowcaseTemplate;
  title: string;
  subtitle?: string;
  cardStyle: IShowcaseCardStyle;
  isActive: boolean;
  order: number;
  tabs: IShowcaseTab[];
  splitLeft?: ISplitPanel;
  splitRight?: ISplitPanel;
  createdAt: Date;
  updatedAt: Date;
}

const PromoSchema = new Schema(
  {
    image: { type: String, trim: true, default: '' },
    video: { type: String, trim: true, default: '' },
    kicker: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    ctaLabel: { type: String, trim: true, default: '' },
    ctaLink: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const TabSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    promotion: { type: PromoSchema, default: () => ({}) },
    productSource: {
      type: String,
      enum: [
        'manual',
        'latest',
        'featured',
        'new-arrivals',
        'best-selling',
        'category',
      ],
      default: 'latest',
    },
    categorySlug: { type: String, trim: true, default: '' },
    productIds: [{ type: String }],
    limit: { type: Number, default: 8, min: 1, max: 24 },
  },
  { _id: false }
);

const SplitPanelSchema = new Schema(
  {
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    mediaUrl: { type: String, trim: true, default: '' },
    posterImage: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    kicker: { type: String, trim: true, default: '' },
    ctaLabel: { type: String, trim: true, default: '' },
    ctaLink: { type: String, trim: true, default: '' },
    productId: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const ProductShowcaseSectionSchema = new Schema<IProductShowcaseSection>(
  {
    template: {
      type: String,
      enum: ['product_showcase', 'split_media'],
      required: true,
      default: 'product_showcase',
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    cardStyle: {
      type: String,
      enum: ['showcase', 'luxury', 'compact'],
      default: 'showcase',
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    tabs: { type: [TabSchema], default: [] },
    splitLeft: { type: SplitPanelSchema },
    splitRight: { type: SplitPanelSchema },
  },
  { timestamps: true }
);

ProductShowcaseSectionSchema.index({ order: 1, createdAt: -1 });
ProductShowcaseSectionSchema.index({ isActive: 1, order: 1 });

const MODEL = 'ProductShowcaseSection';

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(ProductShowcaseSectionSchema, revalidateProductShowcase);

if (mongoose.models[MODEL]) {
  delete mongoose.models[MODEL];
}

export default mongoose.model<IProductShowcaseSection>(
  MODEL,
  ProductShowcaseSectionSchema
);
