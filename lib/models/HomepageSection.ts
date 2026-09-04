import mongoose, { Document, Schema } from 'mongoose';

import {
  HOMEPAGE_SECTION_KEYS,
  isHomepageSectionKey,
  type HomepageSectionKey,
  type HomepageSectionSettings,
} from '@/lib/landing/homepage-sections';

export { HOMEPAGE_SECTION_KEYS, type HomepageSectionKey };

/**
 * One document per homepage render slot. A dedicated collection (rather than an
 * array on the settings singleton) gives real timestamps, per-section updates
 * without read-modify-write races, and a `bulkWrite` reorder that matches the
 * existing `landing-sections/reorder` convention.
 */
export interface IHomepageSection extends Document {
  key: HomepageSectionKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  isEnabled: boolean;
  sortOrder: number;
  /** Free-form per-section options, validated against the registry on write. */
  settings: HomepageSectionSettings;
  createdAt: Date;
  updatedAt: Date;
}

const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    key: {
      type: String,
      // Not an `enum`: product-showcase slots carry a `productShowcase:<id>`
      // key that is created at runtime, one per showcase section.
      validate: {
        validator: isHomepageSectionKey,
        message: (props: { value: unknown }) =>
          `"${props.value}" is not a homepage section key`,
      },
      required: true,
      unique: true,
      index: true,
    },
    eyebrow: { type: String, trim: true, maxlength: 80, default: '' },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    subtitle: { type: String, trim: true, maxlength: 300, default: '' },
    isEnabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, index: true },
    settings: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);

HomepageSectionSchema.index({ isEnabled: 1, sortOrder: 1 });

const HomepageSectionModel =
  (mongoose.models?.HomepageSection as mongoose.Model<IHomepageSection> | undefined) ||
  mongoose.model<IHomepageSection>('HomepageSection', HomepageSectionSchema);

export default HomepageSectionModel;
