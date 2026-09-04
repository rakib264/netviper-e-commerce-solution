import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateEvents } from '@/lib/cache/revalidate';
import mongoose, { Document, Schema } from 'mongoose';

export interface ICTA {
  label: string;
  url: string;
  openInNewTab: boolean;
}

export interface IEvent extends Document {
  title: string;
  subtitle?: string;
  bannerImage?: string;
  discountText: string;
  layoutType: 'horizontal' | 'vertical';
  cta?: ICTA;
  showInLanding: boolean;
  startDate: Date;
  endDate: Date;
  products: mongoose.Types.ObjectId[];
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
  },
  openInNewTab: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const EventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  bannerImage: {
    type: String
  },
  discountText: {
    type: String,
    required: true,
    trim: true
  },
  layoutType: {
    type: String,
    enum: ['horizontal', 'vertical'],
    default: 'horizontal'
  },
  cta: {
    type: CTASchema,
    required: false
  },
  showInLanding: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add validation for start and end dates
EventSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Add virtual for status based on dates
EventSchema.virtual('status').get(function() {
  const now = new Date();
  if (!this.isActive) return 'inactive';
  if (now < this.startDate) return 'upcoming';
  if (now > this.endDate) return 'expired';
  return 'active';
});

/*
 * The landing-page query: active, flagged for the landing page, and inside its
 * schedule window. `startDate` is last because the window is a range scan and a
 * range has to follow the equality predicates to be usable.
 */
EventSchema.index({ isActive: 1, showInLanding: 1, startDate: -1, endDate: 1 });
/** The admin listing and `/events`. */
EventSchema.index({ isActive: 1, startDate: -1 });

// Include virtuals in JSON output
EventSchema.set('toJSON', { virtuals: true });

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(EventSchema, revalidateEvents);

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
