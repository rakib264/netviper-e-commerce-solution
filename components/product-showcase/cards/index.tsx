'use client';

import {
  CompactProductCard,
  LuxuryProductCard,
  ShowcaseProductCard,
} from '@/components/product-showcase/cards/ProductCards';
import type {
  ShowcaseCardStyle,
  ShowcaseProduct,
} from '@/lib/product-showcase/types';

interface Props {
  style: ShowcaseCardStyle;
  product: ShowcaseProduct;
  className?: string;
}

export default function ProductCardByStyle({ style, product, className }: Props) {
  switch (style) {
    case 'luxury':
      return <LuxuryProductCard product={product} className={className} />;
    case 'compact':
      return <CompactProductCard product={product} className={className} />;
    case 'showcase':
    default:
      return <ShowcaseProductCard product={product} className={className} />;
  }
}
