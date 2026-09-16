import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { findComboBundleBySlug } from '@/lib/combo-bundles/resolve';
import { getServerCurrency } from '@/lib/currency/server';
import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import { comboProductSchema } from '@/lib/seo/schema';
import ComboBundlePageClient from './ComboBundlePageClient';

/**
 * Server half: metadata and structured data only, with the interactive page
 * rendered by its client sibling — the pattern `products/[slug]` and
 * `categories/[slug]` already use.
 */

/** Live means active *and* inside its schedule window. */
async function loadLiveCombo(slug: string) {
  const combo = await findComboBundleBySlug(slug).catch(() => null);
  return combo && combo.isActive && combo.isScheduleLive ? combo : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const [combo, { seo, t }] = await Promise.all([
    loadLiveCombo(slug),
    getSeoContext(),
  ]);

  if (!combo) {
    return buildMetadata({
      titleKey: 'seo.comboBundles.title',
      descriptionKey: 'seo.comboBundles.description',
      descriptionValues: { brand: seo.name },
      path: `/combo-bundles/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: combo.name,
    description:
      combo.description ||
      t('seo.combo.descriptionFallback', { name: combo.name, brand: seo.name }),
    path: `/combo-bundles/${combo.slug}`,
    images: combo.images.slice(0, 4).map((url) => ({ url, alt: combo.name })),
  });
}

export default async function ComboBundleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [combo, currency, context] = await Promise.all([
    loadLiveCombo(slug),
    getServerCurrency(),
    getSeoContext(),
  ]);

  // An expired or unknown bundle is a 404. This used to render the client shell
  // with a 200 and no structured data, which is an indexable empty page.
  if (!combo) notFound();

  const { seo, t } = context;
  const description =
    combo.description ||
    t('seo.combo.descriptionFallback', { name: combo.name, brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: `/combo-bundles/${combo.slug}`,
      name: combo.name,
      description,
      primaryImage: combo.images[0],
      breadcrumbs: [
        { name: t('seo.comboBundles.title'), path: '/combo-bundles' },
        { name: combo.name, path: `/combo-bundles/${combo.slug}` },
      ],
      nodes: [
        comboProductSchema(
          seo,
          {
            canonical: seo.absolute(`/combo-bundles/${combo.slug}`),
            name: combo.name,
            description: combo.description || undefined,
            image: combo.images[0],
            price: combo.price,
            inStock: combo.inStock,
            items: combo.components.map((component) => ({
              name: component.name,
              slug: component.slug || undefined,
            })),
          },
          currency,
        ),
      ],
    },
    context,
  );

  return (
    <>
      {/*
        Server-rendered, not `next/script` with `afterInteractive`. Structured
        data has to be in the initial HTML; injecting it after hydration means a
        crawler that does not run JavaScript never sees it at all.
      */}
      <JsonLd graph={graph} />
      <ComboBundlePageClient slug={slug} />
    </>
  );
}
