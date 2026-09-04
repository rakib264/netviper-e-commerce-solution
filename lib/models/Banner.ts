import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateBanners } from '@/lib/cache/revalidate';
import mongoose from 'mongoose';

interface CTAButton {
  label: string;
  url: string;
}

interface HeroProduct {
  productId?: string;
  productSlug?: string;
  productImage?: string;
  productName?: string;
  rating?: number;
  price?: number;
  comparePrice?: number;
}

export interface IBanner {
  _id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  discount?: string;
  image: string;
  backgroundVideo?: string;
  ctaButtons?: CTAButton[];
  ctaButtonLabel?: string;
  ctaButtonUrl?: string;
  products?: HeroProduct[];
  /** Legacy single-product fields */
  productId?: string;
  productSlug?: string;
  productImage?: string;
  productName?: string;
  rating?: number;
  price?: number;
  comparePrice?: number;
  isActive: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const HeroProductSchema = new mongoose.Schema(
  {
    productId: { type: String, trim: true, default: '' },
    productSlug: { type: String, trim: true, default: '' },
    productImage: { type: String, trim: true, default: '' },
    productName: { type: String, trim: true, maxlength: 120, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 5 },
    price: { type: Number, min: 0, default: 0 },
    comparePrice: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const BannerSchema = new mongoose.Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 400 },
    discount: { type: String, trim: true, maxlength: 50 },
    image: { type: String, required: true },
    backgroundVideo: { type: String, trim: true, default: '' },
    ctaButtons: [
      {
        label: { type: String, required: true, trim: true, maxlength: 40 },
        url: { type: String, required: true, trim: true },
      },
    ],
    ctaButtonLabel: { type: String, trim: true, maxlength: 50 },
    ctaButtonUrl: { type: String, trim: true },
    products: { type: [HeroProductSchema], default: [] },
    productId: { type: String, trim: true, default: '' },
    productSlug: { type: String, trim: true, default: '' },
    productImage: { type: String, trim: true, default: '' },
    productName: { type: String, trim: true, maxlength: 120, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 5 },
    price: { type: Number, min: 0, default: 0 },
    comparePrice: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BannerSchema.index({ isActive: 1, order: 1 });

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(BannerSchema, revalidateBanners);

if (mongoose.models.Banner) {
  delete mongoose.models.Banner;
}

const Banner = mongoose.model<IBanner>('Banner', BannerSchema);

export default Banner;
