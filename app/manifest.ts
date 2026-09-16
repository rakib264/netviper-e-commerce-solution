import type { MetadataRoute } from 'next';

import { createTranslator } from '@/lib/i18n/dictionary';
import { BRAND } from '@/lib/seo/brand';
import { getSeoConfig } from '@/lib/seo/config';

/**
 * The PWA manifest, built from `lib/seo/brand.ts` and the DB settings.
 *
 * Replaces `public/manifest.json`, which still described *"Muscari Mart -
 * Premium Women's Sarees"* with saree-collection shortcuts — and which was not
 * even linked from the document, so nothing had ever surfaced how stale it was.
 * Generating it means the manifest cannot rot behind a rebrand again. Next
 * links it automatically; no `<link rel="manifest">` is needed.
 */
export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const seo = await getSeoConfig();
  // The manifest is one document with no request locale to read, so it is
  // written in the store's configured default language.
  const { t } = createTranslator(seo.locale);

  return {
    name: seo.name,
    short_name: seo.shortName,
    description: t(BRAND.descriptionKey),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: BRAND.art.foreground,
    theme_color: BRAND.art.background,
    lang: seo.locale,
    dir: 'ltr',
    categories: ['shopping', 'food', 'grocery'],
    icons: [
      { src: BRAND.favicon, sizes: '48x48', type: 'image/x-icon' },
      { src: BRAND.logo, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: BRAND.logo, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: BRAND.appleIcon, sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      {
        name: t('nav.products'),
        url: '/products',
        icons: [{ src: BRAND.logo, sizes: '192x192' }],
      },
      {
        name: t('nav.categories'),
        url: '/categories',
        icons: [{ src: BRAND.logo, sizes: '192x192' }],
      },
      {
        name: t('nav.deals'),
        url: '/deals',
        icons: [{ src: BRAND.logo, sizes: '192x192' }],
      },
    ],
  };
}
