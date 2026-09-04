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
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";

const BASE_URL = "https://www.muscarimart.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mascari Mart",
    template: "%s | Mascari Mart",
  },
  description:
    "Mascari Mart is a Germany-based premium leather goods house for women and men. Discover handbags, shoulder bags, backpacks, wallets, shoes, and travel essentials crafted for modern timeless style.",
  keywords: [
    "Mascari Mart",
    "premium leather goods",
    "luxury handbags",
    "wallets and small leather goods",
    "backpacks",
    "Germany fashion brand",
    "european luxury accessories",
  ],
  openGraph: {
    type: "website",
    title: "Mascari Mart | Premium Leather Goods",
    description:
      "Premium leather goods for women and men, designed in Germany.",
    siteName: "Mascari Mart",
    url: BASE_URL,
    locale: "de_DE",
    alternateLocale: ["en_GB", "en_US"],
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Mascari Mart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mascari Mart | Premium Leather Goods",
    description:
      "Premium leather goods for women and men, designed in Germany.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "de-DE": BASE_URL,
      "en-GB": `${BASE_URL}/en-gb`,
      "en-US": `${BASE_URL}/en-us`,
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "meta-country": "DE",
  },
};

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

        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Mascari Mart",
              url: BASE_URL,
              logo: `${BASE_URL}/logo.png`,
              description:
                "Germany-based premium leather goods house for women and men.",
              sameAs: [
                "https://www.facebook.com/muscarimart",
                "https://www.instagram.com/muscarimart",
              ],
            }),
          }}
        />

        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Mascari Mart",
              url: BASE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: `${BASE_URL}/products?search={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
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
