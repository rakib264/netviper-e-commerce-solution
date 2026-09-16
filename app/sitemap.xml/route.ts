import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getSeoConfig } from '@/lib/seo/config';
import { sitemapChunkIds } from '@/lib/seo/sitemap-chunks';

/**
 * The sitemap index.
 *
 * `app/sitemap.ts` uses `generateSitemaps`, which registers each child at
 * `/sitemap/<id>.xml` — but Next does not generate the index that ties them
 * together, and `/sitemap.xml` is the URL robots.txt advertises and the one
 * anybody submits to Search Console. Without this route that URL 404s and every
 * child sitemap is undiscoverable.
 *
 * The id list comes from the same module the children are built from, so the
 * index cannot advertise a child that does not exist.
 */
export const dynamic = 'force-dynamic';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const [seo, ids] = await Promise.all([getSeoConfig(), sitemapChunkIds()]);
  const lastModified = new Date().toISOString();

  const entries = ids
    .map(
      (id) =>
        `  <sitemap>\n` +
        `    <loc>${escapeXml(seo.absolute(`/sitemap/${id}.xml`))}</loc>\n` +
        `    <lastmod>${lastModified}</lastmod>\n` +
        `  </sitemap>`,
    )
    .join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</sitemapindex>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER,
    },
  });
}
