import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthSettings extends Document {
  googleAuthEnabled: boolean;
  facebookAuthEnabled: boolean;
  emailAuthEnabled: boolean;
  otpAuthEnabled: boolean;
  passwordMinLength: number;
  requireEmailVerification: boolean;
  allowSelfRegistration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AuthSettingsSchema = new Schema<IAuthSettings>({
  googleAuthEnabled: { type: Boolean, default: false },
  facebookAuthEnabled: { type: Boolean, default: false },
  emailAuthEnabled: { type: Boolean, default: true },
  otpAuthEnabled: { type: Boolean, default: true },
  passwordMinLength: { type: Number, default: 8 },
  requireEmailVerification: { type: Boolean, default: false },
  allowSelfRegistration: { type: Boolean, default: true },
}, {
  timestamps: true
});

export default mongoose.models.AuthSettings || mongoose.model<IAuthSettings>('AuthSettings', AuthSettingsSchema);