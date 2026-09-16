import ClientOnly from "@/components/providers/ClientOnly";
import {
  AutoStartup,
  CartDealsSync,
  FaviconProvider,
  FloatingCartCard,
  LocalizationProvider,
  NextAuthProvider,
  OneSignalProvider,
  ShoppingBasket,
  ThemeProvider,
  Toaster,
} from "@/components/providers/ClientProviders";
import {
  getLocaleMeta,
  LOCALE_COOKIE_NAME,
  normalizeAllowedLocales,
  normalizeLocale,
  resolveActiveLocale,
} from "@/lib/i18n/config";
import StoreProvider from "@/lib/providers/StoreProvider";
import { BRAND } from "@/lib/seo/brand";
import {
  getCachedLocalizationSettings,
  getCachedThemeSettings,
} from "@/lib/theme/general-settings-server";
import {
  colorVariablesToInlineCss,
  createDefaultColorSettings,
  resolveColors,
} from "@/lib/theme/colors";
import {
  createDefaultTypographySettings,
  resolveTypography,
  typographyVariablesToInlineCss,
} from "@/lib/theme/typography";
import { buildMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

/**
 * Site-wide defaults.
 *
 * Every field here comes from `lib/seo/brand.ts` by way of `buildMetadata`, so
 * this file holds no brand string, no base URL and no locale of its own. The
 * previous version hardcoded all three, and disagreed with `app/page.tsx` about
 * two of them.
 *
 * `absoluteTitle` because the root title *is* the brand — running it through
 * the `%s | Ramen Bhai` template would render the name twice. Pages override
 * this wholesale; a page that somehow exports no metadata inherits it.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/",
    absoluteTitle: true,
    keywords: [...BRAND.keywordSeeds],
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaultTypography = resolveTypography(createDefaultTypographySettings());
  const [themeSettings, localizationSettings, cookieStore] = await Promise.all([
    getCachedThemeSettings().catch(() => null),
    getCachedLocalizationSettings().catch(() => null),
    cookies(),
  ]);

  // The visitor's own choice is resolved here, on the server, against the
  // admin's allow-list. Doing it in an effect instead would render the default
  // language first and swap after hydration — a visible flash, and a hydration
  // mismatch on every translated string.
  const defaultLocale = normalizeLocale(localizationSettings?.language);
  const allowedLocales = normalizeAllowedLocales(
    localizationSettings?.allowedLanguages,
    defaultLocale,
  );
  const activeLocale = resolveActiveLocale({
    requested: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    defaultLocale,
    allowedLocales,
  });
  const localeMeta = getLocaleMeta(activeLocale);

  // Colour variables are emitted for both appearances up front so the very first
  // paint is themed, in light or dark, without waiting for client JS.
  const defaultColors = resolveColors(createDefaultColorSettings());
  const initialColorCss = colorVariablesToInlineCss(
    themeSettings?.colorCssVariables || defaultColors.light,
    themeSettings?.colorDarkCssVariables || defaultColors.dark,
  );

  const initialTypographyCss = typographyVariablesToInlineCss(
    themeSettings?.typographyCssVariables || defaultTypography.cssVariables,
  );

  // `null` is a valid resolved value (system fonts need no stylesheet), so only
  // fall back to the defaults when the settings themselves failed to load.
  const typographyStylesheetHref = themeSettings
    ? themeSettings.typographyStylesheetHref
    : defaultTypography.fontStylesheetHref;

  return (
    <html
      lang={localeMeta.intlLocale}
      dir={localeMeta.dir}
      suppressHydrationWarning
    >
      <head>
        {typographyStylesheetHref ? (
          <link
            id="theme-font-stylesheet"
            rel="stylesheet"
            href={typographyStylesheetHref}
          />
        ) : null}
        {initialTypographyCss ? (
          <style
            id="initial-typography-vars"
            dangerouslySetInnerHTML={{ __html: initialTypographyCss }}
          />
        ) : null}
        {initialColorCss ? (
          <style
            id="initial-color-vars"
            dangerouslySetInnerHTML={{ __html: initialColorCss }}
          />
        ) : null}
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_BUNNY_CDN_URL || "https://leather-e-com.b-cdn.net"}
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href={process.env.NEXT_PUBLIC_BUNNY_CDN_URL || "https://leather-e-com.b-cdn.net"}
        />
        {/* Legacy assets may still load from Cloudinary until fully migrated */}
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <meta
          name="theme-color"
          content={themeSettings?.primaryColor || "#1A1A1A"}
        />
        <meta
          name="msapplication-TileColor"
          content={themeSettings?.primaryColor || "#1A1A1A"}
        />

      </head>
      <body suppressHydrationWarning>
        <NextAuthProvider>
          <ThemeProvider
            initialThemeConfig={
              themeSettings
                ? {
                    primaryColor: themeSettings.primaryColor,
                    secondaryColor: themeSettings.secondaryColor,
                    colors: themeSettings.colors,
                    typography: themeSettings.typography,
                    typographyStylesheetHref: themeSettings.typographyStylesheetHref,
                    themeVersion: themeSettings.themeVersion,
                  }
                : undefined
            }
          >
            <LocalizationProvider
              initialLocale={activeLocale}
              initialDefaultLocale={defaultLocale}
              initialAllowedLocales={allowedLocales}
              initialCurrency={localizationSettings?.currency}
            >
              <StoreProvider>
                {children}
                <ClientOnly>
                  <ShoppingBasket />

                  {/* Keeps deal progress, gift lines and the deal discount in step with the server */}
                  <CartDealsSync />
                </ClientOnly>
                <ClientOnly>
                  <FloatingCartCard />
                </ClientOnly>
                <ClientOnly>
                  <Toaster />
                </ClientOnly>
                <ClientOnly>
                  <FaviconProvider />
                </ClientOnly>
                <ClientOnly>
                  <AutoStartup />
                </ClientOnly>
                <ClientOnly>
                  <OneSignalProvider
                    appId={
                      process.env.ONESIGNAL_APP_ID ||
                      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
                      ''
                    }
                  />
                </ClientOnly>
              </StoreProvider>
            </LocalizationProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
