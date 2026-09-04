import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateAdvertisements } from '@/lib/cache/revalidate';
import {
  AD_MEDIA_TYPES,
  AD_TYPES,
  MAX_ADS_PER_TYPE,
  type AdMediaType,
  type AdvertisementType,
} from '@/lib/advertisements/types';
import mongoose, { Document, Schema } from 'mongoose';

export interface ICTA {
  label: string;
  url: string;
}

export interface IAdvertisement extends Document {
  type: AdvertisementType;
  /** Render order within its family (1…MAX_ADS_PER_TYPE). */
  position: number;
  badgeTitle?: string;
  title: string;
  discountText?: string;
  mediaType: AdMediaType;
  /** Bunny CDN URL of the image or video that fills the card. */
  mediaUrl: string;
  /** Still frame shown before a video plays and when playback fails. */
  posterImage?: string;
  /**
   * Legacy still-image field. Kept in sync with the canonical media on write so
   * documents written before the video migration keep rendering.
   */
  bannerImage?: string;
  cta?: ICTA;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CTASchema = new Schema<ICTA>({
  label: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const AdvertisementSchema = new Schema<IAdvertisement>({
  type: {
    type: String,
    enum: [...AD_TYPES],
    required: true,
    index: true
  },
  position: {
    type: Number,
    required: true,
    min: 1,
    max: MAX_ADS_PER_TYPE
  },
  badgeTitle: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  discountText: {
    type: String,
    trim: true
  },
  mediaType: {
    type: String,
    enum: [...AD_MEDIA_TYPES],
    default: 'image'
  },
  mediaUrl: {
    type: String,
    trim: true
  },
  posterImage: {
    type: String,
    trim: true
  },
  // Not required: pre-migration documents carry it, newer video ads may not.
  bannerImage: {
    type: String,
    trim: true
  },
  cta: {
    type: CTASchema,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
AdvertisementSchema.index({ type: 1, position: 1 });
AdvertisementSchema.index({ type: 1, isActive: 1 });

/**
 * Backfill the canonical media fields for documents saved through older code
 * paths, so a read never has to guess.
 */
AdvertisementSchema.pre('save', function (next) {
  if (!this.mediaUrl && this.bannerImage) {
    this.mediaUrl = this.bannerImage;
    this.mediaType = this.mediaType || 'image';
  }
  if (!this.bannerImage) {
    this.bannerImage = this.mediaType === 'video' ? this.posterImage : this.mediaUrl;
  }
  if (!this.mediaUrl) {
    next(new Error('An advertisement needs an image or video'));
    return;
  }
  next();
});

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(AdvertisementSchema, revalidateAdvertisements);

export default mongoose.models.Advertisement || mongoose.model<IAdvertisement>('Advertisement', AdvertisementSchema);
