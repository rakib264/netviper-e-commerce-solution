import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import TermsConditionsPageClient from './TermsConditionsPageClient';

/**
 * Server shell for /terms-conditions.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.termsConditions.title',
    descriptionKey: 'seo.termsConditions.description',
    descriptionValues: { brand: seo.name },
    path: '/terms-conditions',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  const name = t('seo.termsConditions.title');
  const description = t('seo.termsConditions.description', { brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: '/terms-conditions',
      name,
      description,
      breadcrumbs: [{ name, path: '/terms-conditions' }],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <TermsConditionsPageClient />
    </>
  );
}
