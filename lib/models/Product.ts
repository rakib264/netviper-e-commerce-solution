import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateProducts } from '@/lib/cache/revalidate';
import mongoose, { Document, Schema } from 'mongoose';
import { NON_RETURNABLE_REASONS } from '@/lib/returns/policy';

export type VariantMode = 'single' | 'multi';
export type BarcodeType = 'UPC' | 'EAN' | 'ISBN' | 'Custom';

export interface IMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
}

export interface IProductVariant {
  id: string;
  attributeName: string;
  attributeValue: string;
  thumbnailImage: string;
  media: IMediaItem[];
  price: number;
  comparePrice?: number;
  sku: string;
  barcodeType?: BarcodeType;
  barcode?: string;
  trackQuantity: boolean;
  quantity: number;
  /** Legacy fields kept for backward compatibility during migration */
  name?: string;
  value?: string;
  image?: string;
}

export interface ISizeVisualizer {
  enabled: boolean;
  referenceObjectIds: string[];
  bodySilhouetteEnabled: boolean;
  defaultReferenceId?: string;
  unit?: 'cm' | 'in';
  wearStyle?: 'shoulder' | 'crossbody' | 'handheld';
  scaleOverrides?: Record<string, number>;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  editorsNotes?: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  variantMode: VariantMode;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku: string;
  barcodeType?: BarcodeType;
  barcode?: string;
  trackQuantity: boolean;
  quantity: number;
  lowStockThreshold?: number;
  thumbnailImage: string;
  /** Mixed reorderable gallery (images + videos). Source of truth for single mode. */
  media: IMediaItem[];
  /** Legacy flat arrays — kept in sync from media for listing/card compatibility */
  images: string[];
  videoLinks?: string[];
  /** @deprecated Replaced by sizeVisualizer */
  sizeImage?: string;
  /** Freeform, e.g. "1.2 lb" or "0.55 kg" */
  weight?: string;
  /** Freeform measurements, e.g. length: `10.25"` */
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  /** @deprecated Shipping rates live in Settings → Shipping / Courier */
  shippingCost?: number;
  /** Optional class id referencing CourierSettings.shippingClasses */
  shippingClass?: string;
  taxRate?: number;
  isActive: boolean;
  isFeatured: boolean;
  /**
   * Whether this product may be returned at all.
   *
   * Defaults to true, so the entire existing catalogue keeps its current
   * behaviour without a backfill. An admin switches it off for anything a
   * return cannot apply to — a single-use item, a hygiene product, a final-sale
   * line — and `nonReturnableReason` says which, so the customer is told why
   * rather than just refused.
   */
  isReturnable: boolean;
  nonReturnableReason?: string;
  /** Per-product override of the site-wide return window, in days. */
  returnWindowDays?: number;
  isNewArrival: boolean;
  isLimitedEdition: boolean;
  /** Never counts toward a deal trigger and never receives a deal discount. */
  excludedFromPromotions: boolean;
  /** May be handed out as a FREE_GIFT or drawn from a mystery box pool. */
  giftable: boolean;
  tags: string[];
  /** @deprecated Replaced by sizeVisualizer */
  productSize: string[];
  sizeVisualizer?: ISizeVisualizer;
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  variants?: IProductVariant[];
  reviews: {
    _id?: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    rating: number;
    title?: string;
    comment: string;
    verified?: boolean;
    helpful?: number;
    notHelpful?: number;
    createdAt: Date;
  }[];
  averageRating: number;
  totalReviews: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const MediaItemSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    id: { type: String, required: true },
    attributeName: { type: String, default: 'Color' },
    attributeValue: { type: String, default: '' },
    thumbnailImage: { type: String, default: '' },
    media: { type: [MediaItemSchema], default: [] },
    price: { type: Number, default: 0 },
    comparePrice: { type: Number },
    sku: { type: String, default: '' },
    barcodeType: {
      type: String,
      enum: ['UPC', 'EAN', 'ISBN', 'Custom'],
      default: 'Custom',
    },
    barcode: { type: String },
    trackQuantity: { type: Boolean, default: true },
    quantity: { type: Number, default: 0 },
    // Legacy
    name: String,
    value: String,
    image: String,
  },
  { _id: false }
);

const SizeVisualizerSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    referenceObjectIds: [{ type: String }],
    bodySilhouetteEnabled: { type: Boolean, default: false },
    defaultReferenceId: { type: String },
    unit: { type: String, enum: ['cm', 'in'], default: 'cm' },
    wearStyle: {
      type: String,
      enum: ['shoulder', 'crossbody', 'handheld'],
      default: 'shoulder',
    },
    scaleOverrides: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    editorsNotes: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    variantMode: {
      type: String,
      enum: ['single', 'multi'],
      default: 'single',
    },
    price: { type: Number, required: true },
    comparePrice: { type: Number },
    cost: { type: Number },
    sku: { type: String, required: true, unique: true },
    barcodeType: {
      type: String,
      enum: ['UPC', 'EAN', 'ISBN', 'Custom'],
      default: 'Custom',
    },
    barcode: { type: String },
    trackQuantity: { type: Boolean, default: true },
    quantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    thumbnailImage: { type: String, required: true },
    media: { type: [MediaItemSchema], default: [] },
    images: [{ type: String }],
    videoLinks: [{ type: String }],
    sizeImage: { type: String },
    weight: { type: String },
    dimensions: {
      length: { type: String, default: '' },
      width: { type: String, default: '' },
      height: { type: String, default: '' },
    },
    shippingCost: { type: Number },
    shippingClass: { type: String },
    taxRate: { type: Number },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isReturnable: { type: Boolean, default: true },
    nonReturnableReason: {
      type: String,
      enum: NON_RETURNABLE_REASONS,
      required: false,
    },
    // Unset means "use the site-wide window"; `resolveReturnWindowDays` owns
    // that fallback so the default lives in one place.
    returnWindowDays: { type: Number, min: 1, max: 365, required: false },
    isNewArrival: { type: Boolean, default: false },
    isLimitedEdition: { type: Boolean, default: false },
    excludedFromPromotions: { type: Boolean, default: false },
    giftable: { type: Boolean, default: false },
    tags: [{ type: String }],
    productSize: [{ type: String }],
    sizeVisualizer: { type: SizeVisualizerSchema, default: () => ({}) },
    metaTitle: { type: String },
    metaDescription: { type: String },
    seoKeywords: [{ type: String }],
    variants: { type: [VariantSchema], default: [] },
    reviews: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        title: { type: String, trim: true },
        comment: String,
        verified: { type: Boolean, default: false },
        helpful: { type: Number, default: 0 },
        notHelpful: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Sparse unique index on variant SKUs so empty strings don't collide
ProductSchema.index(
  { 'variants.sku': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      'variants.sku': { $type: 'string', $gt: '' },
    },
  }
);

/*
 * Indexes for the storefront's read paths.
 *
 * Every one of these is a query the catalogue actually runs, and every one of
 * them was a collection scan: the only index on this schema was the variant-SKU
 * uniqueness constraint. A scan is invisible on a seed database and is the whole
 * cost of a listing once the catalogue is real.
 *
 * The leading `isActive` is what makes them usable — no storefront query omits
 * it — and the trailing `_id` matches the tiebreaker `/api/products` adds so a
 * non-unique sort key still pages deterministically.
 */

// Newest-first listings: the homepage grid, `/products` page one, `/api/products/list`.
ProductSchema.index({ isActive: 1, createdAt: -1, _id: -1 });

// The flag-scoped rails and their dedicated listing pages.
ProductSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, isNewArrival: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, isLimitedEdition: 1, createdAt: -1 });

// Best-selling, off the counter the order pipeline increments.
ProductSchema.index({ isActive: 1, totalSales: -1, createdAt: -1 });

// Category pages, which query the category plus its descendants (`$in`).
ProductSchema.index({ isActive: 1, category: 1, createdAt: -1 });

// Price and rating sorts/filters on the listing pages.
ProductSchema.index({ isActive: 1, price: 1 });
ProductSchema.index({ isActive: 1, averageRating: -1 });


// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(ProductSchema, revalidateProducts);

export default mongoose.models.Product ||
  mongoose.model<IProduct>('Product', ProductSchema);
