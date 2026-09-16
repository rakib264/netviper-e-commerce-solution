import type { MetadataRoute } from 'next';

import Blog from '@/lib/models/Blog';
import Category from '@/lib/models/Category';
import Event from '@/lib/models/Event';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { BRAND } from '@/lib/seo/brand';
import { getSeoConfig } from '@/lib/seo/config';
import {
  CHUNK_SIZE,
  PUBLISHED_BLOG,
  parseChunkId,
  sitemapChunkIds,
} from '@/lib/seo/sitemap-chunks';

/**
 * The sitemap, split into one child per collection.
 *
 * Previously two systems disagreed: this route listed every URL in one file
 * against the apex domain, while `next-sitemap` wrote a static
 * `public/sitemap.xml` for the `www` host containing 15 URLs, no products at
 * all, and — absurdly — `/robots.txt` and `/sitemap.xml` as though they were
 * pages. The static file shadowed the route, so the one Google actually
 * fetched was the one with no products in it.
 *
 * `next-sitemap` is gone. Splitting by collection means a 10,000-product
 * catalogue does not re-serialize its blog posts on every fetch, and a crawler
 * can see from `lastModified` which child is worth re-reading.
 *
 * Next registers these children at `/sitemap/<id>.xml` but does not generate the
 * index that lists them; `app/sitemap.xml/route.ts` does that, reading the same
 * id list from `lib/seo/sitemap-chunks.ts`.
 */

const { priorities, changefreq } = BRAND.sitemap;

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency'];

/** Routes with no database behind them. */
const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: ChangeFreq;
}> = [
  { path: '/', priority: priorities.home, changeFrequency: changefreq.home as ChangeFreq },
  { path: '/products', priority: priorities.listing, changeFrequency: changefreq.listing as ChangeFreq },
  { path: '/products/featured', priority: priorities.rail, changeFrequency: changefreq.rail as ChangeFreq },
  { path: '/products/new-arrivals', priority: priorities.rail, changeFrequency: changefreq.rail as ChangeFreq },
  { path: '/products/best-selling', priority: priorities.rail, changeFrequency: changefreq.rail as ChangeFreq },
  { path: '/products/limited-edition', priority: priorities.rail, changeFrequency: changefreq.rail as ChangeFreq },
  { path: '/categories', priority: priorities.listing, changeFrequency: changefreq.category as ChangeFreq },
  { path: '/combo-bundles', priority: priorities.listing, changeFrequency: changefreq.listing as ChangeFreq },
  { path: '/deals', priority: priorities.rail, changeFrequency: changefreq.rail as ChangeFreq },
  { path: '/events', priority: priorities.rail, changeFrequency: changefreq.event as ChangeFreq },
  { path: '/explore', priority: priorities.listing, changeFrequency: changefreq.listing as ChangeFreq },
  { path: '/blogs', priority: priorities.blog, changeFrequency: changefreq.blog as ChangeFreq },
  { path: '/about', priority: priorities.blog, changeFrequency: changefreq.policy as ChangeFreq },
  { path: '/contact', priority: priorities.blog, changeFrequency: changefreq.policy as ChangeFreq },
  { path: '/faqs', priority: priorities.listing, changeFrequency: changefreq.policy as ChangeFreq },
  { path: '/privilege-members', priority: priorities.blog, changeFrequency: changefreq.policy as ChangeFreq },
  { path: '/shipping-delivery', priority: priorities.policy, changeFrequency: changefreq.policy as ChangeFreq },
  { path: '/terms-conditions', priority: priorities.policy, changeFrequency: changefreq.policy as ChangeFreq },
  { path: '/privacy-policy', priority: priorities.policy, changeFrequency: changefreq.policy as ChangeFreq },
];

export async function generateSitemaps() {
  return (await sitemapChunkIds()).map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: string;
}): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoConfig();

  if (id === 'static') {
    const now = new Date();
    return STATIC_ROUTES.map((route) => ({
      url: seo.absolute(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
  }

  const { collection, skip } = parseChunkId(id);

  try {
    await connectDB();

    switch (collection) {
      case 'products': {
        const rows = await Product.find({ isActive: true })
          .select('slug updatedAt')
          .sort({ _id: 1 })
          .skip(skip)
          .limit(CHUNK_SIZE)
          .lean<Array<{ slug: string; updatedAt?: Date }>>();

        return rows.map((row) => ({
          url: seo.absolute(`/products/${row.slug}`),
          lastModified: row.updatedAt || new Date(),
          changeFrequency: changefreq.product as ChangeFreq,
          priority: priorities.product,
        }));
      }

      case 'categories': {
        const rows = await Category.find({ isActive: true })
          .select('slug updatedAt')
          .sort({ _id: 1 })
          .skip(skip)
          .limit(CHUNK_SIZE)
          .lean<Array<{ slug: string; updatedAt?: Date }>>();

        return rows.map((row) => ({
          url: seo.absolute(`/categories/${row.slug}`),
          lastModified: row.updatedAt || new Date(),
          changeFrequency: changefreq.category as ChangeFreq,
          priority: priorities.category,
        }));
      }

      case 'blogs': {
        const rows = await Blog.find(PUBLISHED_BLOG)
          .select('slug updatedAt publishedAt')
          .sort({ _id: 1 })
          .skip(skip)
          .limit(CHUNK_SIZE)
          .lean<Array<{ slug: string; updatedAt?: Date; publishedAt?: Date }>>();

        return rows.map((row) => ({
          url: seo.absolute(`/blogs/${row.slug}`),
          lastModified: row.updatedAt || row.publishedAt || new Date(),
          changeFrequency: changefreq.blog as ChangeFreq,
          priority: priorities.blog,
        }));
      }

      case 'events': {
        const rows = await Event.find({ isActive: true })
          .select('_id updatedAt')
          .sort({ _id: 1 })
          .skip(skip)
          .limit(CHUNK_SIZE)
          .lean<Array<{ _id: unknown; updatedAt?: Date }>>();

        return rows.map((row) => ({
          url: seo.absolute(`/events/${String(row._id)}`),
          lastModified: row.updatedAt || new Date(),
          changeFrequency: changefreq.event as ChangeFreq,
          priority: priorities.event,
        }));
      }

      default:
        return [];
    }
  } catch (error) {
    // A database blip must not fail the build or serve a 500 to a crawler. An
    // empty child is a valid sitemap; the next fetch will be complete.
    console.warn(`[sitemap] ${id} failed, serving empty:`, error);
    return [];
  }
}
