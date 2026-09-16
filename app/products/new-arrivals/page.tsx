import type { Metadata } from 'next';

import {
  getCachedProductRailPage,
  getCachedRootCategories,
} from '@/lib/home/storefront-content';
import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { collectionPageSchema, itemListSchema, schemaId } from '@/lib/seo/schema';
import NewArrivalsPageClient from './NewArrivalsPageClient';

/**
 * Server shell for /products/new-arrivals.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.productsNewArrivals.title',
    descriptionKey: 'seo.productsNewArrivals.description',
    descriptionValues: { brand: seo.name },
    path: '/products/new-arrivals',
  });
}

/** Matches the client's own page size, which owns pagination from here on. */
const PAGE_SIZE = 12;

export default async function Page() {
  // The first, unfiltered page is identical for every visitor, so it resolves
  // here and ships inside the HTML. The client still owns search, filtering and
  // pagination — it just no longer fetches the page already on screen.
  const [listing, categories, context] = await Promise.all([
    getCachedProductRailPage('new-arrivals', PAGE_SIZE).catch(() => null),
    getCachedRootCategories(50).catch(() => null),
    getSeoContext(),
  ]);

  const { seo, t } = context;

  const name = t('seo.productsNewArrivals.title');
  const description = t('seo.productsNewArrivals.description', { brand: seo.name });
  const canonical = seo.absolute('/products/new-arrivals');

  const products = (listing?.products || []) as Array<{
    name: string;
    slug: string;
    thumbnailImage?: string;
  }>;
  const itemList = itemListSchema(seo, canonical, products);

  const { graph } = await buildPageGraph(
    {
      path: '/products/new-arrivals',
      name,
      description,
      breadcrumbs: [{ name: t('seo.products.title'), path: '/products' }, { name, path: '/products/new-arrivals' }],
      webPageNode: collectionPageSchema(seo, {
        canonical,
        name,
        description,
        breadcrumbId: schemaId.breadcrumb(canonical),
        itemListId: itemList ? schemaId.itemList(canonical) : undefined,
      }),
      nodes: [itemList],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <NewArrivalsPageClient
        initialProducts={listing?.products as never}
        initialTotal={listing?.total ?? 0}
        initialPages={listing?.pages ?? 0}
        initialCategories={categories as never}
      />
    </>
  );
}
