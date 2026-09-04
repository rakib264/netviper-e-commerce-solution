import mongoose, { Document, Schema } from 'mongoose';

export interface ICourier extends Document {
  courierId: string;
  order: mongoose.Types.ObjectId;
  sender: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    division?: string;
  };
  parcel: {
    type: 'regular' | 'express' | 'fragile';
    quantity: number;
    weight: number;
    value: number;
    description: string;
  };
  isCOD: boolean;
  codAmount?: number;
  isFragile: boolean;
  charges: {
    deliveryCharge: number;
    codCharge: number;
    totalCharge: number;
  };
  status: 'pending' | 'picked' | 'in_transit' | 'delivered' | 'returned' | 'cancelled';
  trackingNumber?: string;
  courierPartner?: string;
  pickupDate?: Date;
  deliveryDate?: Date;
  estimatedDeliveryDate?: Date;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    updatedBy?: string;
    notes?: string;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourierSchema = new Schema<ICourier>({
  courierId: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  sender: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    division: { type: String, required: true },
    district: { type: String, required: true },
  },
  receiver: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    division: { type: String },
  },
  parcel: {
    type: { type: String, enum: ['regular', 'express', 'fragile'], default: 'regular' },
    quantity: { type: Number, required: true },
    weight: { type: Number, required: true },
    value: { type: Number, required: true },
    description: { type: String, required: true },
  },
  isCOD: { type: Boolean, default: false },
  codAmount: { type: Number },
  isFragile: { type: Boolean, default: false },
  charges: {
    deliveryCharge: { type: Number, required: true },
    codCharge: { type: Number, default: 0 },
    totalCharge: { type: Number, required: true },
  },
  status: { 
    type: String, 
    enum: ['pending', 'picked', 'in_transit', 'delivered', 'returned', 'cancelled'], 
    default: 'pending' 
  },
  trackingNumber: { type: String },
  courierPartner: { type: String },
  pickupDate: { type: Date },
  deliveryDate: { type: Date },
  estimatedDeliveryDate: { type: Date },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: String },
    notes: { type: String }
  }],
  notes: { type: String },
}, {
  timestamps: true
});

// Indexes for efficient queries
CourierSchema.index({ order: 1 }); // For finding couriers by order ID
// Note: courierId index is automatically created by unique: true
CourierSchema.index({ status: 1 }); // For filtering by status
CourierSchema.index({ createdAt: -1 }); // For sorting by creation date
CourierSchema.index({ 'order': 1, 'status': 1 }); // Compound index for order-status queries

// Pre-save middleware to track status changes
CourierSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    // Add current status to history if it's not already there
    const lastHistoryEntry = this.statusHistory[this.statusHistory.length - 1];
    if (!lastHistoryEntry || lastHistoryEntry.status !== this.status) {
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
        // updatedBy can be set externally if needed
      });
    }
  }
  next();
});

// Pre-update middleware for findOneAndUpdate operations
CourierSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate() as any;
  if (update && update.status) {
    // Get the current document
    const currentDoc = await this.model.findOne(this.getQuery());
    if (currentDoc && currentDoc.status !== update.status) {
      // Add status history entry
      if (!update.$push) {
        update.$push = {};
      }
      update.$push.statusHistory = {
        status: update.status,
        timestamp: new Date(),
      };
    }
  }
  next();
});

export default mongoose.models.Courier || mongoose.model<ICourier>('Courier', CourierSchema);