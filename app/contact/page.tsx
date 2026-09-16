import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import ContactPageClient from './ContactPageClient';

/**
 * Server shell for /contact.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.contact.title',
    descriptionKey: 'seo.contact.description',
    descriptionValues: { brand: seo.name },
    path: '/contact',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  const name = t('seo.contact.title');
  const description = t('seo.contact.description', { brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: '/contact',
      name,
      description,
      breadcrumbs: [{ name, path: '/contact' }],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <ContactPageClient />
    </>
  );
}
