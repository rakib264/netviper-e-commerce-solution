import type { Metadata } from 'next';

import { FaqSection } from '@/components/seo/FaqSection';
import { JsonLd } from '@/lib/seo/JsonLd';
import { SHIPPING_FAQS } from '@/lib/seo/faq';
import { answerParams, resolveFaqsForPage } from '@/lib/seo/faq-server';
import { faqSchema } from '@/lib/seo/schema';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import ShippingDeliveryPageClient from './ShippingDeliveryPageClient';

/**
 * Server shell for /shipping-delivery.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.shippingDelivery.title',
    descriptionKey: 'seo.shippingDelivery.description',
    descriptionValues: { brand: seo.name },
    path: '/shipping-delivery',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  const faqs = await resolveFaqsForPage(SHIPPING_FAQS, context);
  const canonical = seo.absolute('/shipping-delivery');

  // Interpolated from the same figures the FAQs use, so the sentence at the
  // top of the page and the answers further down cannot disagree.
  const answer = t('answer.shippingDelivery', await answerParams(context));

  const name = t('seo.shippingDelivery.title');
  const description = t('seo.shippingDelivery.description', { brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: '/shipping-delivery',
      name,
      description,
      breadcrumbs: [{ name, path: '/shipping-delivery' }],
      nodes: [faqSchema(canonical, faqs)],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <ShippingDeliveryPageClient answer={answer} />
      <FaqSection faqs={faqs} heading={t('faq.sectionHeading')} />
    </>
  );
}
