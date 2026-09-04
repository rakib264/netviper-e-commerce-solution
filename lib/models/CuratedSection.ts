import mongoose, { Document, Schema } from 'mongoose';

import {
  CURATED_AUTO_SOURCES,
  CURATED_SOURCE_MODES,
  CURATED_VARIANTS,
  MAX_CURATED_PRODUCTS,
} from '@/lib/curated-sections/types';

export interface ICuratedSection extends Document {
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  variant: string;
  isActive: boolean;
  order: number;
  sourceMode: string;
  autoSource: string;
  categorySlug: string;
  manualProductIds: string[];
  limit: number;
  createdAt: Date;
  updatedAt: Date;
}

const CuratedSectionSchema = new Schema<ICuratedSection>(
  {
    // Unique so seeding is idempotent and a section keeps its identity across
    // renames — the label is free text, the key is not.
    key: { type: String, required: true, trim: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    eyebrow: { type: String, trim: true, maxlength: 80, default: '' },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    subtitle: { type: String, trim: true, maxlength: 300, default: '' },
    ctaText: { type: String, trim: true, maxlength: 60, default: '' },
    ctaHref: { type: String, trim: true, maxlength: 300, default: '' },
    variant: { type: String, enum: CURATED_VARIANTS, default: 'grid' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    sourceMode: { type: String, enum: CURATED_SOURCE_MODES, default: 'auto' },
    autoSource: { type: String, enum: CURATED_AUTO_SOURCES, default: 'latest' },
    categorySlug: { type: String, trim: true, default: '' },
    manualProductIds: [{ type: String }],
    limit: { type: Number, default: 8, min: 1, max: MAX_CURATED_PRODUCTS },
  },
  { timestamps: true },
);

CuratedSectionSchema.index({ isActive: 1, order: 1 });

const CuratedSectionModel =
  (mongoose.models?.CuratedSection as mongoose.Model<ICuratedSection> | undefined) ||
  mongoose.model<ICuratedSection>('CuratedSection', CuratedSectionSchema);

export default CuratedSectionModel;
