import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { collectionPageSchema, schemaId } from '@/lib/seo/schema';
import ComboBundlesListingClient from './ComboBundlesListingClient';

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.comboBundles.title',
    descriptionKey: 'seo.comboBundles.description',
    descriptionValues: { brand: seo.name },
    path: '/combo-bundles',
  });
}

export default async function ComboBundlesPage() {
  const context = await getSeoContext();
  const { seo, t } = context;

  const canonical = seo.absolute('/combo-bundles');
  const name = t('seo.comboBundles.title');
  const description = t('seo.comboBundles.description', { brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: '/combo-bundles',
      name,
      description,
      breadcrumbs: [{ name, path: '/combo-bundles' }],
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
      <ComboBundlesListingClient />
    </>
  );
}
