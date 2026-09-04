import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegrationSettings extends Document {
  // Bunny Storage + CDN (preferred). Secrets live in env; these are optional UI mirrors.
  bunnyEnabled: boolean;
  bunnyStorageZoneName: string;
  bunnyCdnUrl: string;

  /** @deprecated Replaced by Bunny — kept for backward-compatible DB docs */
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  
  // Twilio SMS Settings
  twilioEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  
  // ZamanIT SMS Settings
  zamanitEnabled: boolean;
  zamanitApiKey: string;
  zamanitSenderId: string;
  zamanitBaseUrl: string;
  
  // Email Settings
  emailEnabled: boolean;
  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSettingsSchema = new Schema<IIntegrationSettings>({
  bunnyEnabled: { type: Boolean, default: true },
  bunnyStorageZoneName: { type: String, default: '' },
  bunnyCdnUrl: { type: String, default: '' },

  // Legacy Cloudinary fields (no longer used at runtime)
  cloudinaryEnabled: { type: Boolean, default: false },
  cloudinaryCloudName: { type: String, default: '' },
  cloudinaryApiKey: { type: String, default: '' },
  cloudinaryApiSecret: { type: String, default: '' },
  
  twilioEnabled: { type: Boolean, default: false },
  twilioAccountSid: { type: String, default: '' },
  twilioAuthToken: { type: String, default: '' },
  twilioPhoneNumber: { type: String, default: '' },
  
  zamanitEnabled: { type: Boolean, default: true },
  zamanitApiKey: { type: String, default: '' },
  zamanitSenderId: { type: String, default: '' },
  zamanitBaseUrl: { type: String, default: 'http://45.120.38.242/api/sendsms' },
  
  emailEnabled: { type: Boolean, default: true },
  emailProvider: { type: String, default: 'smtp' },
  smtpHost: { type: String, default: '' },
  smtpPort: { type: Number, default: 587 },
  smtpUser: { type: String, default: '' },
  smtpPassword: { type: String, default: '' },
}, {
  timestamps: true
});

export default mongoose.models.IntegrationSettings || mongoose.model<IIntegrationSettings>('IntegrationSettings', IntegrationSettingsSchema);
