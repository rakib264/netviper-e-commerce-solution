import type { Metadata } from 'next';

import { FaqSection } from '@/components/seo/FaqSection';
import { JsonLd } from '@/lib/seo/JsonLd';
import { GENERAL_FAQS } from '@/lib/seo/faq';
import { answerParams, resolveFaqsForPage } from '@/lib/seo/faq-server';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { faqSchema, schemaId } from '@/lib/seo/schema';
import FAQsPageClient from './FAQsPageClient';

/**
 * Server shell for /faqs.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.faqs.title',
    descriptionKey: 'seo.faqs.description',
    descriptionValues: { brand: seo.name },
    path: '/faqs',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  // Resolved once and handed to both consumers: the visible section below and
  // the FAQPage JSON-LD. Schema whose answers do not appear on the page is a
  // spam signal, so the two must be the same strings.
  const faqs = await resolveFaqsForPage(GENERAL_FAQS, context);

  // Interpolated from the same figures the FAQs use, so the sentence at the
  // top of the page and the answers further down cannot disagree.
  const answer = t('answer.faqs', await answerParams(context));

  const name = t('seo.faqs.title');
  const description = t('seo.faqs.description', { brand: seo.name });
  const canonical = seo.absolute('/faqs');

  const { graph } = await buildPageGraph(
    {
      path: '/faqs',
      name,
      description,
      breadcrumbs: [{ name, path: '/faqs' }],
      nodes: [faqSchema(canonical, faqs)],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <FAQsPageClient answer={answer} />
      {/*
        Server-rendered, below the client half. These are the answers an answer
        engine quotes, so they have to be in the initial HTML rather than
        appearing once a bundle has hydrated.
      */}
      <FaqSection faqs={faqs} heading={t('faq.sectionHeading')} />
    </>
  );
}
