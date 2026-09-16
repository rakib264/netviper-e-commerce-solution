import 'server-only';

import Blog from '@/lib/models/Blog';
import Category from '@/lib/models/Category';
import Event from '@/lib/models/Event';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';

/**
 * Which child sitemaps exist.
 *
 * Shared by `app/sitemap.ts`, which serves each child, and
 * `app/sitemap.xml/route.ts`, which serves the index listing them. Next's
 * `generateSitemaps` registers the children at `/sitemap/<id>.xml` but does not
 * produce the index itself, so the two have to agree on the id list — and the
 * only safe way to make two files agree is to give them one source.
 */

/** Google's hard limit is 50,000 URLs per file; 5,000 keeps each one small. */
export const CHUNK_SIZE = 5000;

export const PUBLISHED_BLOG = {
  status: 'published',
  isActive: true,
  publishedAt: { $lte: new Date() },
};

/**
 * How many chunks a collection needs.
 *
 * A failed count yields one (possibly empty) chunk rather than none: an empty
 * sitemap is a valid sitemap, whereas an index advertising a child that 404s is
 * a crawl error.
 */
async function chunkCount(
  model: { countDocuments: (filter: object) => Promise<number> },
  filter: object,
): Promise<number> {
  try {
    await connectDB();
    const total = await model.countDocuments(filter);
    return Math.max(1, Math.ceil(total / CHUNK_SIZE));
  } catch {
    return 1;
  }
}

/** Every child sitemap id, in the order the index should list them. */
export async function sitemapChunkIds(): Promise<string[]> {
  const [products, categories, blogs, events] = await Promise.all([
    chunkCount(Product as never, { isActive: true }),
    chunkCount(Category as never, { isActive: true }),
    chunkCount(Blog as never, PUBLISHED_BLOG),
    chunkCount(Event as never, { isActive: true }),
  ]);

  const ids = ['static'];
  const push = (prefix: string, count: number) => {
    for (let index = 0; index < count; index++) ids.push(`${prefix}-${index}`);
  };

  push('products', products);
  push('categories', categories);
  push('blogs', blogs);
  push('events', events);

  return ids;
}

/** Split `products-3` into its collection and its zero-based offset. */
export function parseChunkId(id: string): { collection: string; skip: number } {
  const [collection, rawIndex] = id.split(/-(?=\d+$)/);
  return { collection, skip: Number(rawIndex || 0) * CHUNK_SIZE };
}
