import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
  type CurrencyCode,
} from '@/lib/currency/config';
import {
  DEFAULT_LOCALE,
  normalizeAllowedLocales,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n/config';
import {
  resolveColors,
  type ColorSettings,
} from '@/lib/theme/colors';
import {
  createDefaultTypographySettings,
  resolveTypography,
  type TypographySettings,
} from '@/lib/theme/typography';

/**
 * Pre-rebrand site names, treated as "unset" rather than as a deliberate
 * choice. A settings row written before a rebrand keeps its old `siteName`
 * forever, and without this list one stale row silently resurrects a dead
 * brand across every page title and JSON-LD node.
 *
 * Kept in step with `LEGACY_SITE_NAMES` in `lib/seo/config.ts`, which applies
 * the same guard on the SEO read path.
 */
const OLD_HARDCODED_SITE_NAMES = [
  'TSR Gallery',
  'TSRGallery',
  'NextEcom',
  'Mascari Mart',
  'Muscari Mart',
  'muscari-mart',
  'muscarimart',
];

/** The market the store operates in. See `lib/seo/brand.ts`. */
const DEFAULT_TIMEZONE = 'Asia/Dhaka';
const OLD_HARDCODED_DESCRIPTIONS = ['Your Trusted Online Shopping Destination'];

export interface GeneralSettingsLike {
  siteName?: string;
  siteDescription?: string;
  siteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  address?: string;
  logo1?: string;
  logo2?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
  };
  socialLinks?: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
  };
  currency?: string;
  timezone?: string;
  language?: string;
  allowedLanguages?: string[];
  typography?: TypographySettings | Record<string, unknown> | null;
  colorPresetId?: string | null;
  themeVersion?: number;
}

export interface PublicGeneralSettingsPayload {
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
  location: {
    address: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
  };
  socialLinks: {
    facebook?: string;
    youtube?: string;
    instagram?: string;
    tiktok?: string;
  };
  /** Always one of the supported codes — see `lib/currency/config.ts`. */
  currency: CurrencyCode;
  timezone: string;
  /** Always one of the supported locales — see `lib/i18n/config.ts`. */
  language: Locale;
  /** Ordered, deduped, and guaranteed to contain `language`. */
  allowedLanguages: Locale[];
  typography: TypographySettings;
  /** Resolved brand palette plus the semantic variables derived from it. */
  colors: ColorSettings;
  colorCssVariables: Record<string, string>;
  colorDarkCssVariables: Record<string, string>;
  typographyCssVariables: Record<string, string>;
  typographyStylesheetHref: string | null;
  typographyFontsInUse: Array<{
    id: string;
    displayName: string;
    source: 'google' | 'system' | 'licensed';
    weights: number[];
    googleFamily?: string;
  }>;
  themeVersion: number;
}

function isOldHardcodedValue(value: string | undefined, oldValues: string[]): boolean {
  if (!value || value.trim() === '') return false;
  return oldValues.includes(value.trim());
}

function normalizeColor(
  color: string | undefined,
  forbidden: string[],
  fallback: string,
): string {
  if (!color || forbidden.includes(color)) {
    return fallback;
  }
  return color;
}

/** Pre-rebrand defaults that must not be treated as a deliberate brand choice. */
const LEGACY_PRIMARY_COLORS = ['#3949AB', '#2D5A3D'];
const LEGACY_SECONDARY_COLORS = ['#10b981', '#D4AF37'];

/**
 * Resolve the stored brand pair to what should actually be rendered. Shared by the
 * public payload and the admin API so the preview cannot drift from the storefront.
 */
export function resolveBrandColorPair(
  settings:
    | { primaryColor?: string; secondaryColor?: string; colorPresetId?: string | null }
    | null
    | undefined,
): { presetId: string | null; primaryColor: string; secondaryColor: string } {
  return {
    presetId: settings?.colorPresetId ?? null,
    primaryColor: normalizeColor(settings?.primaryColor, LEGACY_PRIMARY_COLORS, '#1A1A1A'),
    secondaryColor: normalizeColor(
      settings?.secondaryColor,
      LEGACY_SECONDARY_COLORS,
      '#F5F5F3',
    ),
  };
}

export function buildPublicGeneralSettingsPayload(
  settings: GeneralSettingsLike | null | undefined,
): PublicGeneralSettingsPayload {
  const typographyInput = settings?.typography || createDefaultTypographySettings();
  const resolvedTypography = resolveTypography(typographyInput);

  const cleanSiteName =
    settings?.siteName && !isOldHardcodedValue(settings.siteName, OLD_HARDCODED_SITE_NAMES)
      ? settings.siteName
      : '';

  const cleanSiteDescription =
    settings?.siteDescription &&
    !isOldHardcodedValue(settings.siteDescription, OLD_HARDCODED_DESCRIPTIONS)
      ? settings.siteDescription
      : '';

  const brandPair = resolveBrandColorPair(settings);
  const normalizedPrimaryColor = brandPair.primaryColor;
  const normalizedSecondaryColor = brandPair.secondaryColor;

  // The whole semantic palette follows from the two brand colours, so it is
  // derived here rather than stored, keeping a single source of truth.
  const resolvedColors = resolveColors(brandPair);

  // Both are coerced onto the supported set here, so every consumer of the public
  // payload can trust the value without re-validating it.
  const normalizedCurrency = normalizeCurrency(
    settings?.currency || process.env.NEXT_PUBLIC_CURRENCY,
    DEFAULT_CURRENCY,
  );
  const normalizedLanguage = normalizeLocale(
    settings?.language || process.env.NEXT_PUBLIC_LANGUAGE,
    DEFAULT_LOCALE,
  );
  const normalizedAllowedLanguages = normalizeAllowedLocales(
    settings?.allowedLanguages,
    normalizedLanguage,
  );
  // The admin's own choice, honoured. This used to rewrite a stored
  // `Asia/Dhaka` into `Europe/Berlin` during the Germany rebrand, which meant
  // the one timezone the store actually operates in was the one value the
  // settings screen could not save.
  const normalizedTimezone = settings?.timezone?.trim() || '';

  return {
    siteName: cleanSiteName || process.env.NEXT_PUBLIC_SITE_NAME || '',
    siteDescription:
      cleanSiteDescription || process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '',
    siteUrl: settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '',
    contactEmail: settings?.contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
    contactPhone: settings?.contactPhone || process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
    contactPerson: settings?.contactPerson || '',
    address: settings?.address || process.env.NEXT_PUBLIC_CONTACT_ADDRESS || '',
    logo1: settings?.logo1 || '',
    logo2: settings?.logo2 || '',
    favicon: settings?.favicon || '',
    primaryColor: normalizedPrimaryColor,
    secondaryColor: normalizedSecondaryColor,
    location: {
      address: settings?.location?.address || '',
      latitude: settings?.location?.latitude || 0,
      longitude: settings?.location?.longitude || 0,
      formattedAddress: settings?.location?.formattedAddress || '',
    },
    socialLinks: settings?.socialLinks || {},
    currency: normalizedCurrency,
    timezone: normalizedTimezone || process.env.NEXT_PUBLIC_TIMEZONE || DEFAULT_TIMEZONE,
    language: normalizedLanguage,
    allowedLanguages: normalizedAllowedLanguages,
    typography: resolvedTypography.settings,
    colors: resolvedColors.settings,
    colorCssVariables: resolvedColors.light,
    colorDarkCssVariables: resolvedColors.dark,
    typographyCssVariables: resolvedTypography.cssVariables,
    typographyStylesheetHref: resolvedTypography.fontStylesheetHref,
    typographyFontsInUse: resolvedTypography.fontsInUse,
    themeVersion:
      typeof settings?.themeVersion === 'number' && Number.isFinite(settings.themeVersion)
        ? settings.themeVersion
        : 1,
  };
}
