import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationChannelPreferences {
  enabled: boolean;
  orderUpdates: boolean;
  marketing: boolean;
}

export interface INotificationPreferences {
  push: INotificationChannelPreferences;
  inApp: Pick<INotificationChannelPreferences, 'enabled'>;
  /** Declared now, honoured when the email/SMS pipelines are moved onto the policy engine. */
  email: INotificationChannelPreferences;
  sms: INotificationChannelPreferences;
}

export interface IUser extends Document {
  email: string;
  password?: string; // Optional for social login users
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'customer';
  phone?: string;
  profileImage?: string;
  address?: {
    street: string;
    division: string;
    district: string;
    postCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  isActive: boolean;
  /** Free-form segment tags used by the `customer_group` deal audience. */
  customerGroups: string[];
  /**
   * Per-channel notification opt-ins.
   *
   * Absent on every account created before this field existed, which is why
   * nothing reads it directly — `resolveNotificationPreferences` in
   * `lib/notifications/preferences.ts` fills the gaps. Marketing defaults to
   * off on every channel: an existing user never consented to it, and inferring
   * consent from silence is not something a stored default should do.
   */
  notificationPreferences?: INotificationPreferences;
  emailVerified: boolean;
  authProvider?: 'google' | 'facebook' | 'credentials';
  authProviderId?: string;
  lastLogin?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for social login
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'customer'], default: 'customer' },
  phone: { type: String },
  profileImage: { type: String },
  address: {
    street: String,
    division: String,
    district: String,
    postCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  isActive: { type: Boolean, default: true },
  customerGroups: { type: [String], default: [] },
  notificationPreferences: {
    push: {
      enabled: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
    inApp: {
      enabled: { type: Boolean, default: true },
    },
    // Future-ready and conservative: the email and SMS pipelines still have
    // their own opt-in handling, so these are declared but not yet enforced.
    email: {
      enabled: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },
    sms: {
      enabled: { type: Boolean, default: false },
      orderUpdates: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
    },
  },
  emailVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['google', 'facebook', 'credentials'], default: 'credentials' },
  authProviderId: { type: String },
  lastLogin: { type: Date },
  deletedAt: { type: Date },
}, {
  timestamps: true
});

// Add validation to ensure password exists for credential-based users
UserSchema.pre('save', function(next) {
  if (this.authProvider === 'credentials' && !this.password) {
    return next(new Error('Password is required for credential-based authentication'));
  }
  next();
});

/**
 * Customer analytics are all "customers created in this window": the customer
 * total, the growth series and the recent-customers widget (which also sorts
 * by `createdAt`). Without this each one scanned every user.
 */
UserSchema.index({ role: 1, createdAt: -1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);