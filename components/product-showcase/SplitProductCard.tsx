'use client';

import { useAddToCart } from '@/components/product-showcase/cards/use-add-to-cart';
import { ShowcasePrice } from '@/components/product-showcase/Price';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import type { ShowcaseProduct } from '@/lib/product-showcase/types';
import { cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * The product callout on a split-media panel.
 *
 * Why this exists rather than reusing a grid card: the showcase cards are
 * `bg-transparent` with their copy *below* the image, which is right on the
 * page ground and wrong on video. Dropped onto a panel, only the thumbnail had
 * a surface — the name, price and swatches sat directly on a moving frame, so
 * the card read as broken rather than minimal.
 *
 * This is the inverse: one solid, bordered, slightly elevated surface holding
 * everything, laid out horizontally so it stays legible at the width a panel
 * can actually spare. The whole strip is a link to the product; the bag button
 * is a sibling rather than a nested control, so there is no interactive element
 * inside an anchor.
 */
export function SplitProductCard({
  product,
  className,
}: {
  product: ShowcaseProduct;
  className?: string;
}) {
  const { t } = useTranslation();
  const image = product.images?.[0] || '/placeholder-product.jpg';
  const handleAdd = useAddToCart(product, product.price, image);

  return (
    <div
      className={cn(
        'group/card flex items-center gap-3 rounded-lg border border-border bg-card p-2.5',
        // A real surface, not a tint: opaque `bg-card` plus a border so the
        // edge stays defined against a bright frame, and a soft shadow so it
        // reads as sitting above the media rather than punched into it.
        'shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]',
        'sm:gap-4 sm:p-3',
        className,
      )}
    >
      <Link
        href={product.href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:gap-4"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted sm:h-16 sm:w-16">
          <Image
            src={image}
            alt=""
            fill
            sizes="64px"
            className="object-cover object-center transition-transform duration-500 ease-out motion-safe:group-hover/card:scale-[1.04]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-title text-[0.8125rem] leading-snug text-card-foreground sm:text-sm">
            {product.name}
          </p>
          <ShowcasePrice
            price={product.price}
            comparePrice={product.comparePrice}
            className="mt-1 text-[0.8125rem] sm:text-sm"
            regularClassName="text-card-foreground"
          />
        </div>
      </Link>

      <button
        type="button"
        onClick={handleAdd}
        aria-label={t('product.addToCartNamed', { product: product.name })}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
          'bg-primary text-primary-foreground transition-colors duration-200',
          'hover:bg-primary/90 active:bg-primary',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        )}
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default SplitProductCard;
