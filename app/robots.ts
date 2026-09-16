import type { MetadataRoute } from 'next';

import { BRAND } from '@/lib/seo/brand';
import { getSeoConfig } from '@/lib/seo/config';

/**
 * robots.txt, generated from `lib/seo/brand.ts`.
 *
 * This used to be one of two competing robots files: this route served the
 * apex domain with one disallow list while `next-sitemap` wrote a static
 * `public/robots.txt` for the `www` host with a different one — and a static
 * file in `public/` wins over the route, so the one actually served was the one
 * nobody was editing. `next-sitemap` is gone; this is now the only robots.txt.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoConfig();

  /**
   * Session-bound surfaces, plus the legacy dev scaffolding.
   *
   * `/api/test-*`, `/api/debug*`, `/api/seed` and the queue endpoints are
   * unauthenticated leftovers. They were never linked, but "not linked" is not
   * "not crawlable" — anything that has ever appeared in a referrer header or a
   * pasted URL gets found.
   */
  const disallow = [
    ...BRAND.sitemap.excludePaths.map((path) => `${path}/`),
    '/_next/',
    '/api/test-',
    '/api/debug',
    '/api/seed',
    '/api/create-test-data',
    '/api/processQueue',
    '/api/consume-queue',
    '/api/clear-queue',
    '/api/queue-status',
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },

      /*
       * AI crawlers, named explicitly.
       *
       * They inherit the `*` rule anyway; stating them is a deliberate,
       * readable declaration of policy rather than a technical necessity. The
       * training-corpus bots — GPTBot, Google-Extended, Applebot-Extended,
       * CCBot — are allowed by an explicit business decision: blocking them
       * also removes the store from those answer surfaces.
       */
      ...BRAND.aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow,
      })),
    ],
    sitemap: seo.absolute('/sitemap.xml'),
    host: seo.url,
  };
}
