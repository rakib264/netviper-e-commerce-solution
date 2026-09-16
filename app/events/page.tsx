import type { Metadata } from 'next';

import { getCachedScheduledEvents } from '@/lib/home/storefront-content';
import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { collectionPageSchema, schemaId } from '@/lib/seo/schema';
import EventsPageClient from './EventsPageClient';

/**
 * Server shell for /events.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.events.title',
    descriptionKey: 'seo.events.description',
    descriptionValues: { brand: seo.name },
    path: '/events',
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

  const name = t('seo.events.title');
  const description = t('seo.events.description', { brand: seo.name });
  const canonical = seo.absolute('/events');

  const { graph } = await buildPageGraph(
    {
      path: '/events',
      name,
      description,
      breadcrumbs: [{ name, path: '/events' }],
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
      <EventsPageClient initialEvents={events as never} />
    </>
  );
}
