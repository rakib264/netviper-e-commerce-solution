import { attachStorefrontInvalidation } from '@/lib/cache/model-invalidation';
import { revalidateCustomerFeedback } from '@/lib/cache/revalidate';
import mongoose from 'mongoose';

export interface ICustomerFeedback {
  platform: 'facebook' | 'messenger' | 'instagram' | 'whatsapp' | 'email';
  platformName: string;
  customer: {
    name: string; // Can be Bengali or English
    avatar: string; // CDN image URL
    location: string;
    verified: boolean;
  };
  message: string; // Can be Bengali or English
  rating: number;
  productImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerFeedbackSchema = new mongoose.Schema<ICustomerFeedback>(
  {
    platform: {
      type: String,
      enum: ['facebook', 'messenger', 'instagram', 'whatsapp', 'email'],
      required: true,
      default: 'facebook',
    },
    platformName: {
      type: String,
      required: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      avatar: {
        type: String,
        required: true,
      },
      location: {
        type: String,
        required: true,
        trim: true,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
    productImage: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
customerFeedbackSchema.index({ isActive: 1, createdAt: -1 });
customerFeedbackSchema.index({ rating: -1 });

// A write here makes the storefront's cached reads stale; see
// `lib/cache/model-invalidation.ts` for why this lives on the schema.
attachStorefrontInvalidation(customerFeedbackSchema, revalidateCustomerFeedback);

const CustomerFeedback =
  mongoose.models.CustomerFeedback ||
  mongoose.model<ICustomerFeedback>('CustomerFeedback', customerFeedbackSchema);

export default CustomerFeedback;

