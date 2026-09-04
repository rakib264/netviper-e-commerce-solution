import mongoose, { Document, Schema } from 'mongoose';
import { RETURN_STATUSES, type ReturnStatus } from '@/lib/returns/policy';

export interface IReturnRequest extends Document {
  requestId: string;
  orderId: string;
  userId?: mongoose.Types.ObjectId;
  customerName: string;
  email: string;
  phone: string;
  type: 'return' | 'exchange';
  reason: string;
  details: string;
  products: {
    /**
     * The catalogue product this line refers to.
     *
     * Optional only for backward compatibility: requests created before the
     * form was bound to real order lines carry a typed-in `productName` and
     * nothing else. Everything created now sets it, which is what makes
     * per-product policy and quantity accounting possible.
     */
    productId?: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    variant?: string;
    reason: string;
    details?: string;
  }[];
  attachments: string[];
  status: ReturnStatus;
  statusHistory: {
    status: string;
    message: string;
    timestamp: Date;
    /** User id of the actor, or absent for a customer-initiated entry. */
    updatedBy?: string;
    /** Who caused it, so a timeline can be read without joining to users. */
    actorRole?: 'customer' | 'admin' | 'system';
  }[];
  adminNotes?: string;
  refundAmount?: number;
  refundMethod?: string;
  trackingNumber?: string;
  courierName?: string;
  /** Set when an admin accepted a request the policy would have refused. */
  policyOverride?: {
    by: mongoose.Types.ObjectId;
    at: Date;
    reason: string;
    /** The ineligibility codes that were waived. */
    waivedCodes: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequest>({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: false,
    trim: true
  },
  type: {
    type: String,
    enum: ['return', 'exchange'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    required: false,
    trim: true
  },
  products: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99
    },
    variant: {
      type: String,
      required: false,
      trim: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: String,
      required: false,
      trim: true
    }
  }],
  attachments: [{
    type: String,
    required: false
  }],
  status: {
    type: String,
    enum: RETURN_STATUSES,
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      required: false
    },
    actorRole: {
      type: String,
      enum: ['customer', 'admin', 'system'],
      required: false
    }
  }],
  adminNotes: {
    type: String,
    required: false,
    trim: true
  },
  refundAmount: {
    type: Number,
    required: false,
    min: 0
  },
  refundMethod: {
    type: String,
    required: false,
    enum: ['original_payment', 'store_credit', 'bank_transfer']
  },
  trackingNumber: {
    type: String,
    required: false,
    trim: true
  },
  courierName: {
    type: String,
    required: false,
    trim: true
  },
  policyOverride: {
    by: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    at: { type: Date, required: false },
    reason: { type: String, required: false, trim: true },
    waivedCodes: { type: [String], default: undefined }
  }
}, {
  timestamps: true
});

// Indexes for better performance
// Note: requestId already has unique: true which creates an index; avoid duplicating it
ReturnRequestSchema.index({ orderId: 1, status: 1 });
ReturnRequestSchema.index({ userId: 1 });
ReturnRequestSchema.index({ email: 1 });
ReturnRequestSchema.index({ status: 1, createdAt: -1 });
ReturnRequestSchema.index({ createdAt: -1 });

export const ReturnRequest = mongoose.models.ReturnRequest || mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema);
