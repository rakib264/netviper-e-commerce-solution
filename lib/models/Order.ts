import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  customer?: mongoose.Types.ObjectId;
  items: {
    /** Absent on a combo/bundle line, which is sold as one unit of its own. */
    product?: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    image?: string;
    /** Injected by the deals engine; priced at 0 and not removable. */
    isGift?: boolean;
    sourceDeal?: mongoose.Types.ObjectId;
    /**
     * A combo/bundle is one order line at one fixed price. The composition is
     * snapshotted alongside it for fulfilment, returns and the invoice — the
     * offer can be edited or deleted after the order, so the line cannot rely
     * on reading it back.
     */
    itemType?: 'product' | 'combo_bundle';
    comboBundle?: mongoose.Types.ObjectId;
    comboType?: 'combo' | 'bundle';
    components?: {
      product: mongoose.Types.ObjectId;
      variantId?: string;
      name: string;
      qty: number;
      unitPrice?: number;
    }[];
  }[];
  subtotal: number;
  tax: number;
  taxRate: number;
  shippingCost: number;
  discountAmount: number;
  couponCode?: string;
  /** Discount from the deals engine, kept apart from the coupon discount. */
  dealDiscount: number;
  total: number;
  paymentMethod: 'cod' | 'sslcommerz' | 'bkash' | 'nagad';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    name: string;
    phone: string;
    email?: string;
    street: string;
    city: string;
    district: string;
    division: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
      divisionName?: string;
      district?: string;
      thanaOrUpazilaName?: string;
      placeName?: string;
      countryCode?: string;
    };
  };
  billingAddress?: {
    name: string;
    phone: string;
    email?: string;
    street: string;
    city: string;
    district: string;
    division: string;
    postalCode?: string;
  };
  deliveryType: 'Inside Dhaka' | 'Outside Dhaka';
  expectedDelivery?: Date;
  deliveredAt?: Date;
  notes?: string;
  trackingNumber?: string;
  courierInfo?: {
    courierName: string;
    trackingId: string;
    courierPhone?: string;
  };
  paymentDetails?: {
    transactionId?: string;
    gatewayData?: any;
    validationId?: string;
    cardType?: string;
    paidAmount?: number;
    paidAt?: Date;
    failureReason?: string;
    ipnReceived?: boolean;
    ipnData?: any;
    validationData?: any;
    cancelledAt?: Date;
    failedAt?: Date;
  };
  invoiceUrl?: string;
  invoiceGenerated?: boolean;
  invoiceGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  items: [{
    // Required for a product line only: a combo/bundle line points at the
    // offer instead, and carries its components in `components`.
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: function (this: { itemType?: string }) {
        return this.itemType !== 'combo_bundle';
      }
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    variant: String,
    image: String,
    isGift: { type: Boolean, default: false },
    sourceDeal: { type: Schema.Types.ObjectId, ref: 'Deal' },
    itemType: { type: String, enum: ['product', 'combo_bundle'], default: 'product' },
    comboBundle: { type: Schema.Types.ObjectId, ref: 'ComboBundle' },
    comboType: { type: String, enum: ['combo', 'bundle'] },
    components: [{
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      variantId: String,
      name: { type: String, required: true },
      qty: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, default: 0 },
      _id: false
    }]
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  couponCode: String,
  dealDiscount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['cod', 'sslcommerz', 'bkash', 'nagad'], 
    default: 'cod' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  orderStatus: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    street: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    division: { type: String, required: true },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number,
      divisionName: String,
      district: String,
      thanaOrUpazilaName: String,
      placeName: String,
      countryCode: String
    }
  },
  billingAddress: {
    name: String,
    phone: String,
    email: String,
    street: String,
    city: String,
    district: String,
    division: String,
    postalCode: String
  },
  deliveryType: { 
    type: String, 
    enum: ['Inside Dhaka', 'Outside Dhaka'], 
    default: 'Inside Dhaka' 
  },
  expectedDelivery: Date,
  deliveredAt: Date,
  notes: String,
  trackingNumber: String,
  courierInfo: {
    courierName: String,
    trackingId: String,
    courierPhone: String
  },
  paymentDetails: {
    transactionId: String,
    gatewayData: Schema.Types.Mixed,
    validationId: String,
    cardType: String,
    paidAmount: Number,
    paidAt: Date,
    failureReason: String,
    ipnReceived: { type: Boolean, default: false },
    ipnData: Schema.Types.Mixed,
    validationData: Schema.Types.Mixed,
    cancelledAt: Date,
    failedAt: Date
  },
  invoiceUrl: String,
  invoiceGenerated: { type: Boolean, default: false },
  invoiceGeneratedAt: Date
}, {
  timestamps: true
});

/*
 * Indexes.
 *
 * The collection carried none beyond the implicit unique `orderNumber`, so
 * every admin analytic — all of which are date-windowed — was a full scan.
 * Each index below is here for named queries; nothing speculative.
 */

/**
 * The workhorse. Every dashboard and targeting aggregation opens with
 * `createdAt: { $gte, $lte }`, and the recent-orders widget sorts by it.
 */
OrderSchema.index({ createdAt: -1 });

/**
 * Status-scoped windows: the district heatmap and the geo demand roll-ups
 * (`orderStatus $in [...] ` + date range), and the line-item pipeline behind
 * the category mix and top sellers.
 */
OrderSchema.index({ orderStatus: 1, createdAt: -1 });

/**
 * Paid-only windows: the revenue series, the spend leaderboard and the
 * payment-health split all filter or branch on `paymentStatus`.
 */
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });

/**
 * Per-customer history: the retention snapshot groups by customer across all
 * time up to the window end, and the returning-customer filter looks up a
 * customer's orders directly.
 */
OrderSchema.index({ customer: 1, createdAt: -1 });

/**
 * The admin order list. It routinely filters on `orderStatus` *and*
 * `paymentStatus` together ("unfulfilled + paid"), and the two single-leg
 * indexes above can each serve only one of them — the other leg becomes a
 * filter applied after the scan. This is not redundant with either: a query
 * naming only `paymentStatus` still needs `{ paymentStatus, createdAt }`,
 * because this index's leading key is `orderStatus`.
 */
OrderSchema.index({ orderStatus: 1, paymentStatus: 1, createdAt: -1 });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);