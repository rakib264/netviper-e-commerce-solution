import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { collectionPageSchema, schemaId } from '@/lib/seo/schema';
import ExplorePageClient from './ExplorePageClient';

/**
 * Server shell for /explore.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.explore.title',
    descriptionKey: 'seo.explore.description',
    descriptionValues: { brand: seo.name },
    path: '/explore',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  const name = t('seo.explore.title');
  const description = t('seo.explore.description', { brand: seo.name });
  const canonical = seo.absolute('/explore');

  const { graph } = await buildPageGraph(
    {
      path: '/explore',
      name,
      description,
      breadcrumbs: [{ name, path: '/explore' }],
      webPageNode: collectionPageSchema(seo, {
        canonical,
        name,
        description,
        breadcrumbId: schemaId.breadcrumb(canonical),
      }),
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <ExplorePageClient />
    </>
  );
}
