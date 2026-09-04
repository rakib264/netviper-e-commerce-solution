import type { Metadata } from 'next';

import ComboBundlesListingClient from './ComboBundlesListingClient';

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://muscarimart.com'
    : 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'Combos & Bundles | Mascari Mart',
  description:
    'Fixed-price combos and bundles: two or more Mascari Mart pieces sold together as one unit, for less than the sum of their parts.',
  alternates: { canonical: `${BASE_URL}/combo-bundles` },
  openGraph: {
    title: 'Combos & Bundles | Mascari Mart',
    description:
      'Fixed-price combos and bundles, sold as one unit for less than the sum of their parts.',
    url: `${BASE_URL}/combo-bundles`,
    siteName: 'Mascari Mart',
    type: 'website',
  },
};

export default function ComboBundlesPage() {
  return <ComboBundlesListingClient />;
}
