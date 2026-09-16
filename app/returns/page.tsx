import type { Metadata } from 'next';

import { buildMetadata } from '@/lib/seo/metadata';
import { getSeoContext } from '@/lib/seo/graph';
import ReturnsPageClient from './ReturnsPageClient';

/**
 * Server shell for /returns.
 *
 * Session-bound, so `buildMetadata` marks it noindex from its path alone — the
 * private-route list lives in the factory rather than being a rule each page
 * has to remember. No JSON-LD: there is nothing to describe on a page no
 * crawler should index.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.returns.title',
    descriptionKey: 'seo.privateDescription',
    descriptionValues: { brand: seo.name },
    path: '/returns',
  });
}

export default function Page() {
  return <ReturnsPageClient />;
}
