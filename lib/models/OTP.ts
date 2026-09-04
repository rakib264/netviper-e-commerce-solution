import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phone?: string;
  email?: string;
  otp: string;
  type: 'password_reset' | 'phone_verification' | 'email_verification';
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>({
  phone: { type: String },
  email: { type: String },
  otp: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['password_reset', 'phone_verification', 'email_verification'], 
    required: true 
  },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
}, {
  timestamps: true
});

// Custom validation to ensure at least one of phone or email is provided
OTPSchema.pre('validate', function() {
  if (!this.phone && !this.email) {
    this.invalidate('phone', 'Either phone or email is required');
    this.invalidate('email', 'Either phone or email is required');
  }
});

// Auto-delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);