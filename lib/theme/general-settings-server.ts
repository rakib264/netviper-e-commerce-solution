import 'server-only';

import { unstable_cache } from 'next/cache';

import connectDB from '@/lib/mongodb';
import GeneralSettings from '@/lib/models/GeneralSettings';
import {
  buildPublicGeneralSettingsPayload,
  type PublicGeneralSettingsPayload,
} from '@/lib/theme/general-settings';

export const PUBLIC_GENERAL_SETTINGS_CACHE_TAG = 'public-general-settings';
export const THEME_SETTINGS_CACHE_TAG = 'theme-settings';

async function readGeneralSettingsFromDatabase(): Promise<Record<string, unknown> | null> {
  await connectDB();
  const settings = await GeneralSettings.findOne().lean<Record<string, unknown>>();
  return settings || null;
}

export async function getFreshPublicGeneralSettings(): Promise<PublicGeneralSettingsPayload> {
  const settings = await readGeneralSettingsFromDatabase();
  return buildPublicGeneralSettingsPayload(settings || null);
}

/**
 * The whole public settings payload, cached.
 *
 * Same tags as the two narrower readers below, so one admin save invalidates
 * all three. `/api/settings/general` reads through this rather than querying,
 * which is what makes that endpoint cacheable at all.
 */
export const getCachedPublicGeneralSettings = unstable_cache(
  async () => getFreshPublicGeneralSettings(),
  ['public-general-settings-cache-v1'],
  {
    tags: [PUBLIC_GENERAL_SETTINGS_CACHE_TAG, THEME_SETTINGS_CACHE_TAG],
  },
);

export const getCachedThemeSettings = unstable_cache(
  async () => {
    const settings = await getFreshPublicGeneralSettings();
    return {
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      colors: settings.colors,
      colorCssVariables: settings.colorCssVariables,
      colorDarkCssVariables: settings.colorDarkCssVariables,
      typography: settings.typography,
      typographyCssVariables: settings.typographyCssVariables,
      typographyStylesheetHref: settings.typographyStylesheetHref,
      themeVersion: settings.themeVersion,
    };
  },
  ['theme-settings-cache-v1'],
  {
    tags: [PUBLIC_GENERAL_SETTINGS_CACHE_TAG, THEME_SETTINGS_CACHE_TAG],
  },
);

/**
 * Language + currency only, for the root layout. Split from the theme cache so a
 * server render can resolve localization without pulling in the whole palette,
 * but it shares the same cache tags: one admin save invalidates both.
 */
export const getCachedLocalizationSettings = unstable_cache(
  async () => {
    const settings = await getFreshPublicGeneralSettings();
    return {
      language: settings.language,
      allowedLanguages: settings.allowedLanguages,
      currency: settings.currency,
    };
  },
  ['localization-settings-cache-v1'],
  {
    tags: [PUBLIC_GENERAL_SETTINGS_CACHE_TAG, THEME_SETTINGS_CACHE_TAG],
  },
);
