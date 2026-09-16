import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { answerParams } from '@/lib/seo/faq-server';
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

  // Interpolated from the same figures the FAQs use, so the sentence at the
  // top of the page and the answers further down cannot disagree.
  const answer = t('answer.contact', await answerParams(context));

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
      <ContactPageClient answer={answer} />
    </>
  );
}
