import { auth } from '@/lib/auth';
import { isSupportedCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency/config';
import {
  isSupportedLocale,
  normalizeAllowedLocales,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from '@/lib/i18n/config';
import GeneralSettings from '@/lib/models/GeneralSettings';
import { resolveBrandColorPair } from '@/lib/theme/general-settings';
import {
  PUBLIC_GENERAL_SETTINGS_CACHE_TAG,
  THEME_SETTINGS_CACHE_TAG,
} from '@/lib/theme/general-settings-server';
import {
  applyColorPreset,
  hasColorsChanged,
  normalizeColorSettings,
  resolveColors,
} from '@/lib/theme/colors';
import {
  hasTypographyChanged,
  normalizeTypographySettings,
} from '@/lib/theme/typography';
import connectDB from '@/lib/mongodb';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Get or create settings
    let settings = await GeneralSettings.findOne();
    if (!settings) {
      settings = await GeneralSettings.create({});
    }
    
    const responseTypography = normalizeTypographySettings(
      settings?.typography || null,
    ).settings;
    const responseColors = resolveColors(resolveBrandColorPair(settings));

    return NextResponse.json({
      ...(settings?.toObject ? settings.toObject() : settings),
      typography: responseTypography,
      colors: responseColors.settings,
      colorCssVariables: responseColors.light,
      colorDarkCssVariables: responseColors.dark,
      colorPreview: responseColors.lightHex,
      colorPreviewDark: responseColors.darkHex,
      colorContrast: responseColors.contrast,
      themeVersion: settings?.themeVersion || 1,
    });
  } catch (error) {
    console.error('General settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch general settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    await connectDB();

    const existingSettings = await GeneralSettings.findOne();

    // Build update payload with whitelisted fields (use dotted paths for nested)
    const {
      siteName,
      siteDescription,
      siteUrl,
      contactEmail,
      contactPhone,
      contactPerson,
      address,
      logo1,
      logo2,
      favicon,
      primaryColor,
      secondaryColor,
      colorPresetId,
      location,
      currency,
      timezone,
      language,
      allowedLanguages,
      socialLinks,
      typography,
    } = data || {};

    const $set: Record<string, any> = {};
    if (typeof siteName !== 'undefined') $set['siteName'] = siteName;
    if (typeof siteDescription !== 'undefined') $set['siteDescription'] = siteDescription;
    if (typeof siteUrl !== 'undefined') $set['siteUrl'] = siteUrl;
    if (typeof contactEmail !== 'undefined') $set['contactEmail'] = contactEmail;
    if (typeof contactPhone !== 'undefined') $set['contactPhone'] = contactPhone;
    if (typeof contactPerson !== 'undefined') $set['contactPerson'] = contactPerson;
    if (typeof address !== 'undefined') $set['address'] = address;
    if (typeof logo1 !== 'undefined') $set['logo1'] = logo1;
    if (typeof logo2 !== 'undefined') $set['logo2'] = logo2;
    if (typeof favicon !== 'undefined') $set['favicon'] = favicon;
    // primaryColor / secondaryColor / colorPresetId are validated together below,
    // so that an unparseable hex is rejected instead of poisoning the palette.
    if (typeof timezone !== 'undefined') $set['timezone'] = timezone;

    // Currency and language are validated rather than coerced: silently saving a
    // different value than the admin picked is worse than a 400 they can see.
    if (typeof currency !== 'undefined') {
      if (!isSupportedCurrency(currency)) {
        return NextResponse.json(
          {
            error: 'Invalid currency',
            details: [
              `Currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}.`,
            ],
          },
          { status: 400 },
        );
      }
      $set['currency'] = currency;
    }

    if (typeof language !== 'undefined') {
      if (!isSupportedLocale(language)) {
        return NextResponse.json(
          {
            error: 'Invalid language',
            details: [`Language must be one of ${SUPPORTED_LOCALES.join(', ')}.`],
          },
          { status: 400 },
        );
      }
      $set['language'] = language;
    }

    // The allow-list and the default are validated together: the default must
    // stay inside the allow-list, or the switcher would offer no way back to it.
    const nextDefaultLanguage = normalizeLocale(
      typeof language !== 'undefined' ? language : existingSettings?.language,
    );

    if (typeof allowedLanguages !== 'undefined') {
      if (!Array.isArray(allowedLanguages)) {
        return NextResponse.json(
          { error: 'Invalid allowed languages', details: ['Expected an array of locale codes.'] },
          { status: 400 },
        );
      }

      const unknown = allowedLanguages.filter((code) => !isSupportedLocale(code));
      if (unknown.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid allowed languages',
            details: [
              `Unsupported locale(s): ${unknown.join(', ')}. Allowed: ${SUPPORTED_LOCALES.join(', ')}.`,
            ],
          },
          { status: 400 },
        );
      }

      $set['allowedLanguages'] = normalizeAllowedLocales(
        allowedLanguages,
        nextDefaultLanguage,
      );
    } else if (typeof language !== 'undefined') {
      // Changing only the default still has to pull it into the allow-list.
      $set['allowedLanguages'] = normalizeAllowedLocales(
        existingSettings?.allowedLanguages,
        nextDefaultLanguage,
      );
    }
    if (location && typeof location === 'object') {
      if (typeof location.address !== 'undefined') $set['location.address'] = location.address;
      if (typeof location.latitude !== 'undefined') $set['location.latitude'] = location.latitude;
      if (typeof location.longitude !== 'undefined') $set['location.longitude'] = location.longitude;
      if (typeof location.formattedAddress !== 'undefined') $set['location.formattedAddress'] = location.formattedAddress;
    }
    if (socialLinks && typeof socialLinks === 'object') {
      if (typeof socialLinks.facebook !== 'undefined') $set['socialLinks.facebook'] = socialLinks.facebook;
      if (typeof socialLinks.youtube !== 'undefined') $set['socialLinks.youtube'] = socialLinks.youtube;
      if (typeof socialLinks.instagram !== 'undefined') $set['socialLinks.instagram'] = socialLinks.instagram;
      if (typeof socialLinks.tiktok !== 'undefined') $set['socialLinks.tiktok'] = socialLinks.tiktok;
    }

    const existingTypography = normalizeTypographySettings(
      existingSettings?.typography || null,
    ).settings;
    let normalizedTypography = existingTypography;
    let typographyWasProvided = false;

    if (typeof typography !== 'undefined') {
      typographyWasProvided = true;
      const normalized = normalizeTypographySettings(typography);
      if (normalized.errors.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid typography configuration',
            details: normalized.errors,
          },
          { status: 400 },
        );
      }
      normalizedTypography = normalized.settings;
      $set.typography = normalizedTypography;
    }

    const existingColors = normalizeColorSettings(
      resolveBrandColorPair(existingSettings),
    ).settings;

    const colorsWereProvided =
      typeof primaryColor !== 'undefined' ||
      typeof secondaryColor !== 'undefined' ||
      typeof colorPresetId !== 'undefined';

    let normalizedColors = existingColors;

    if (colorsWereProvided) {
      // Selecting a preset adopts its pair; an explicit colour then overrides it,
      // which is what makes "pick a preset, then tweak" behave the way it reads.
      const presetBase =
        typeof colorPresetId === 'string' ? applyColorPreset(colorPresetId) : null;
      if (typeof colorPresetId === 'string' && colorPresetId && !presetBase) {
        return NextResponse.json(
          { error: 'Invalid colour configuration', details: [`Unknown colour preset "${colorPresetId}".`] },
          { status: 400 },
        );
      }

      const normalized = normalizeColorSettings({
        presetId: typeof colorPresetId !== 'undefined' ? colorPresetId : existingColors.presetId,
        primaryColor:
          typeof primaryColor !== 'undefined'
            ? primaryColor
            : presetBase?.primaryColor ?? existingColors.primaryColor,
        secondaryColor:
          typeof secondaryColor !== 'undefined'
            ? secondaryColor
            : presetBase?.secondaryColor ?? existingColors.secondaryColor,
      });

      if (normalized.errors.length > 0) {
        return NextResponse.json(
          { error: 'Invalid colour configuration', details: normalized.errors },
          { status: 400 },
        );
      }

      normalizedColors = normalized.settings;
      $set.primaryColor = normalizedColors.primaryColor;
      $set.secondaryColor = normalizedColors.secondaryColor;
      $set.colorPresetId = normalizedColors.presetId;
    }

    // A language or currency change has to bump the version too: the storefront
    // uses `themeVersion` as its "site config moved" signal across tabs, and
    // localization rides the same cache tags.
    const isLocalizationChanged =
      (typeof currency !== 'undefined' && currency !== existingSettings?.currency) ||
      (typeof language !== 'undefined' && language !== existingSettings?.language) ||
      (typeof $set['allowedLanguages'] !== 'undefined' &&
        JSON.stringify($set['allowedLanguages']) !==
          JSON.stringify(
            normalizeAllowedLocales(
              existingSettings?.allowedLanguages,
              normalizeLocale(existingSettings?.language),
            ),
          ));

    const isThemeChanged =
      !existingSettings ||
      isLocalizationChanged ||
      hasColorsChanged(existingColors, normalizedColors) ||
      hasTypographyChanged(
        existingTypography,
        typographyWasProvided ? normalizedTypography : existingTypography,
      );

    const updatePayload: Record<string, any> = Object.keys($set).length > 0 ? { $set } : {};
    if (isThemeChanged) {
      updatePayload.$inc = { themeVersion: 1 };
    }

    const settings = await GeneralSettings.findOneAndUpdate({}, updatePayload, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });

    // Invalidate all theme/settings caches so typography updates are immediate.
    revalidateTag(PUBLIC_GENERAL_SETTINGS_CACHE_TAG);
    revalidateTag(THEME_SETTINGS_CACHE_TAG);
    revalidatePath('/', 'layout');

    const responseTypography = normalizeTypographySettings(
      settings?.typography || null,
    ).settings;
    const responseColors = resolveColors(resolveBrandColorPair(settings));

    return NextResponse.json({
      ...(settings?.toObject ? settings.toObject() : settings),
      typography: responseTypography,
      colors: responseColors.settings,
      colorCssVariables: responseColors.light,
      colorDarkCssVariables: responseColors.dark,
      colorPreview: responseColors.lightHex,
      colorPreviewDark: responseColors.darkHex,
      colorContrast: responseColors.contrast,
      themeVersion: settings?.themeVersion || 1,
    });
  } catch (error) {
    console.error('Update general settings error:', error);
    return NextResponse.json({ 
      error: 'Failed to update general settings', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
