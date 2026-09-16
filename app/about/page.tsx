import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { answerParams } from '@/lib/seo/faq-server';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import AboutUsPageClient from './AboutUsPageClient';

/**
 * Server shell for /about.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.about.title',
    descriptionKey: 'seo.about.description',
    descriptionValues: { brand: seo.name },
    path: '/about',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  // Interpolated from the same figures the FAQs use, so the sentence at the
  // top of the page and the answers further down cannot disagree.
  const answer = t('answer.about', await answerParams(context));

  const name = t('seo.about.title');
  const description = t('seo.about.description', { brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: '/about',
      name,
      description,
      breadcrumbs: [{ name, path: '/about' }],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <AboutUsPageClient answer={answer} />
    </>
  );
}
