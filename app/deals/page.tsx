import type { Metadata } from 'next';

import { getCachedScheduledEvents } from '@/lib/home/storefront-content';
import { JsonLd } from '@/lib/seo/JsonLd';
import { answerParams } from '@/lib/seo/faq-server';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { collectionPageSchema, schemaId } from '@/lib/seo/schema';
import DealsPageClient from './DealsPageClient';

/**
 * Server shell for /deals.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.deals.title',
    descriptionKey: 'seo.deals.description',
    descriptionValues: { brand: seo.name },
    path: '/deals',
  });
}

export default async function Page() {
  // Resolved here so the content ships inside the HTML rather than appearing
  // only after the client has hydrated and fetched for itself.
  const [events, context] = await Promise.all([
    getCachedScheduledEvents(20).catch(() => null),
    getSeoContext(),
  ]);

  const { seo, t } = context;

  const name = t('seo.deals.title');
  const description = t('seo.deals.description', { brand: seo.name });
  const canonical = seo.absolute('/deals');

  const answer = t("answer.deals", await answerParams(context));

  const { graph } = await buildPageGraph(
    {
      path: '/deals',
      name,
      description,
      breadcrumbs: [{ name, path: '/deals' }],
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
      <DealsPageClient initialEvents={events as never} answer={answer} />
    </>
  );
}
