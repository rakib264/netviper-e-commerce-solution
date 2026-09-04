import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentSettings extends Document {
  isPaymentGatewayEnabled: boolean;
  sslcommerzStoreId: string;
  sslcommerzStorePassword: string;
  sslcommerzSandbox: boolean;
  codEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSettingsSchema = new Schema<IPaymentSettings>({
  isPaymentGatewayEnabled: { type: Boolean, default: false },
  sslcommerzStoreId: { type: String, default: '' },
  sslcommerzStorePassword: { type: String, default: '' },
  sslcommerzSandbox: { type: Boolean, default: true },
  codEnabled: { type: Boolean, default: true },
}, {
  timestamps: true
});

export default mongoose.models.PaymentSettings || mongoose.model<IPaymentSettings>('PaymentSettings', PaymentSettingsSchema);