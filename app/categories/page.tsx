import type { Metadata } from 'next';

import { getCachedCategoryTree } from '@/lib/home/storefront-content';
import { JsonLd } from '@/lib/seo/JsonLd';
import { answerParams } from '@/lib/seo/faq-server';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { collectionPageSchema, schemaId } from '@/lib/seo/schema';
import CategoriesPageClient from './CategoriesPageClient';

/**
 * Server shell for /categories.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.categories.title',
    descriptionKey: 'seo.categories.description',
    descriptionValues: { brand: seo.name },
    path: '/categories',
  });
}

export default async function Page() {
  // Resolved here so the content ships inside the HTML rather than appearing
  // only after the client has hydrated and fetched for itself.
  const [categories, context] = await Promise.all([
    getCachedCategoryTree().catch(() => null),
    getSeoContext(),
  ]);

  const { seo, t } = context;

  // Interpolated from the same figures the FAQs use, so the sentence at the
  // top of the page and the answers further down cannot disagree.
  const answer = t('answer.categories', await answerParams(context));

  const name = t('seo.categories.title');
  const description = t('seo.categories.description', { brand: seo.name });
  const canonical = seo.absolute('/categories');

  const { graph } = await buildPageGraph(
    {
      path: '/categories',
      name,
      description,
      breadcrumbs: [{ name, path: '/categories' }],
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
      <CategoriesPageClient initialCategories={categories as never} answer={answer} />
    </>
  );
}
