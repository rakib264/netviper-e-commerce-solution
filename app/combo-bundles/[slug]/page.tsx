import type { Metadata } from 'next';
import Script from 'next/script';

import { findComboBundleBySlug } from '@/lib/combo-bundles/resolve';
import ComboBundlePageClient from './ComboBundlePageClient';
import { getServerCurrency } from '@/lib/currency/server';

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://muscarimart.com'
    : 'http://localhost:3000';

/**
 * Server half: metadata and structured data only, with the interactive page
 * rendered by its client sibling — the pattern `products/[slug]` and
 * `categories/[slug]` already use.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const combo = await findComboBundleBySlug(slug);

    if (!combo || !combo.isActive || !combo.isScheduleLive) {
      return {
        title: 'Offer Not Found | Mascari Mart',
        description: 'This combo or bundle is no longer available.',
      };
    }

    const kind = combo.comboType === 'bundle' ? 'Bundle' : 'Combo';
    const title = `${combo.name} | ${kind} | Mascari Mart`;
    const description =
      combo.description?.slice(0, 160) ||
      `${combo.name} — ${combo.componentCount} Mascari Mart pieces sold together as one ${kind.toLowerCase()}.`;

    return {
      title,
      description,
      alternates: { canonical: `${BASE_URL}/combo-bundles/${combo.slug}` },
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/combo-bundles/${combo.slug}`,
        siteName: 'Mascari Mart',
        type: 'website',
        images: combo.images.slice(0, 4).map((image) => ({
          url: image,
          width: 1200,
          height: 630,
          alt: combo.name,
        })),
      },
    };
  } catch {
    return {
      title: 'Combos & Bundles | Mascari Mart',
      description: 'Fixed-price combos and bundles from Mascari Mart.',
    };
  }
}

export default async function ComboBundleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const combo = await findComboBundleBySlug(slug);

  const jsonLd =
    combo && combo.isActive && combo.isScheduleLive
      ? {
          '@context': 'https://schema.org',
          // A combo is a bundle of goods sold at one price, which is exactly
          // what schema.org models here.
          '@type': 'Product',
          name: combo.name,
          description: combo.description || undefined,
          image: combo.images.slice(0, 4),
          url: `${BASE_URL}/combo-bundles/${combo.slug}`,
          isRelatedTo: combo.components.map((component) => ({
            '@type': 'Product',
            name: component.name,
            url: component.slug ? `${BASE_URL}/products/${component.slug}` : undefined,
          })),
          offers: {
            '@type': 'Offer',
            price: combo.price,
            priceCurrency: await getServerCurrency(),
            availability: combo.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            url: `${BASE_URL}/combo-bundles/${combo.slug}`,
          },
        }
      : null;

  return (
    <>
      {jsonLd ? (
        <Script
          id={`combo-bundle-jsonld-${slug}`}
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <ComboBundlePageClient slug={slug} />
    </>
  );
}
