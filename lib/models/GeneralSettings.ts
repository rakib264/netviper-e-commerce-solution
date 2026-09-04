import mongoose, { Document, Schema } from 'mongoose';
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '@/lib/currency/config';
import {
  DEFAULT_ALLOWED_LOCALES,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/lib/i18n/config';
import {
  createDefaultTypographySettings,
  DEFAULT_TYPOGRAPHY_PRESET_ID,
  type TypographySettings,
} from '@/lib/theme/typography';

export interface IGeneralSettings extends Document {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  address: string;
  logo1: string;
  logo2: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  /** Colour preset id, or null when primary/secondary were picked by hand. */
  colorPresetId: string | null;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  };
  socialLinks?: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
  };
  currency: CurrencyCode;
  timezone: string;
  /** Site default language — what a visitor with no choice of their own sees. */
  language: Locale;
  /** Languages offered in the storefront switcher. Always includes `language`. */
  allowedLanguages: Locale[];
  typography: TypographySettings;
  themeVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const defaultTypography = createDefaultTypographySettings();

const TypographyRoleSchema = new Schema(
  {
    fontId: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 100, max: 900 },
  },
  { _id: false },
);

const TypographySchema = new Schema(
  {
    mode: { type: String, enum: ['single', 'multi'], default: 'multi' },
    globalFontId: { type: String, default: defaultTypography.globalFontId, trim: true },
    presetId: { type: String, default: DEFAULT_TYPOGRAPHY_PRESET_ID, trim: true },
    roles: {
      body: { type: TypographyRoleSchema, default: defaultTypography.roles.body },
      heading: { type: TypographyRoleSchema, default: defaultTypography.roles.heading },
      title: { type: TypographyRoleSchema, default: defaultTypography.roles.title },
      subtitle: { type: TypographyRoleSchema, default: defaultTypography.roles.subtitle },
      paragraph: { type: TypographyRoleSchema, default: defaultTypography.roles.paragraph },
      button: { type: TypographyRoleSchema, default: defaultTypography.roles.button },
      navigation: {
        type: TypographyRoleSchema,
        default: defaultTypography.roles.navigation,
      },
      label: { type: TypographyRoleSchema, default: defaultTypography.roles.label },
      price: { type: TypographyRoleSchema, default: defaultTypography.roles.price },
      caption: { type: TypographyRoleSchema, default: defaultTypography.roles.caption },
      display: { type: TypographyRoleSchema, default: defaultTypography.roles.display },
    },
  },
  { _id: false },
);

const GeneralSettingsSchema = new Schema<IGeneralSettings>({
  siteName: { type: String, default: '' },
  siteDescription: { type: String, default: '' },
  siteUrl: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  address: { type: String, default: '' },
  logo1: { type: String, default: '' },
  logo2: { type: String, default: '' },
  favicon: { type: String, default: '' },
  primaryColor: { type: String, default: '#1A1A1A' },
  secondaryColor: { type: String, default: '#F5F5F3' },
  // The full semantic palette is derived from primaryColor + secondaryColor at
  // read time, so only the two brand colours and the preset id are persisted.
  colorPresetId: { type: String, default: null },
  location: {
    address: { type: String, default: '' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    formattedAddress: { type: String, default: '' }
  },
  socialLinks: {
    facebook: { type: String, default: '' },
    youtube: { type: String, default: '' },
    instagram: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  // Enums are sourced from the currency/i18n registries so adding a currency or
  // a locale is a one-file change rather than a hunt through the schema.
  currency: {
    type: String,
    enum: [...SUPPORTED_CURRENCIES],
    default: 'EUR',
  },
  timezone: { type: String, default: 'Europe/Berlin' },
  language: {
    type: String,
    enum: [...SUPPORTED_LOCALES],
    default: 'en',
  },
  allowedLanguages: {
    type: [String],
    enum: [...SUPPORTED_LOCALES],
    default: () => [...DEFAULT_ALLOWED_LOCALES],
  },
  typography: { type: TypographySchema, default: createDefaultTypographySettings },
  themeVersion: { type: Number, default: 1, min: 1 },
}, {
  timestamps: true
});

export default mongoose.models.GeneralSettings || mongoose.model<IGeneralSettings>('GeneralSettings', GeneralSettingsSchema);