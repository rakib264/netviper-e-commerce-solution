'use client';

import {
  useCurrency,
  useTranslation,
} from '@/components/providers/LocalizationProvider';
import { ColorSwatches } from '@/components/ui/color-swatches';
import {
  PRODUCT_CARD_CTA,
  useProductCardModel,
  type ProductCardProduct,
} from '@/components/ui/product-card-model';
import { cn } from '@/lib/utils';
import { Heart, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * A product inside a promotional event.
 *
 * Same system as the listing card — same swatches, same price roles, same
 * Add-to-Bag — but framed as part of a campaign rather than a catalogue: the
 * image sits on the card surface behind a hairline, the saving is stated as a
 * corner marker, and the event price leads with the old one struck through
 * beside it. Event bands used to render the plain listing card, which made a
 * promotion indistinguishable from ordinary stock.
 */
export interface EventProductCardProps {
  product: ProductCardProduct;
  /** The event's own discount copy, shown when a product has no compare price. */
  fallbackDiscountLabel?: string;
  priority?: boolean;
  className?: string;
}

export default function EventProductCard({
  product,
  fallbackDiscountLabel,
  priority = false,
  className,
}: EventProductCardProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const card = useProductCardModel(product);

  const savingLabel = card.discountPercent
    ? t('events.eventCard.percentOff', { percent: card.discountPercent })
    : (fallbackDiscountLabel || '').trim() || null;

  return (
    <article
      className={cn(
        'group flex h-full flex-col border border-border bg-card transition-colors duration-300 hover:border-foreground/25',
        className,
      )}
    >
      {/*
        Square, not 4:5. The frame is the card's whole height budget, and a
        portrait box around landscape product stills left a band of empty
        surface above and below the bag while making the card itself tall
        enough to push the price and CTA out of the first screen. Square holds
        both orientations without letterboxing either.
      */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10"
          aria-label={product.name}
        />

        <Image
          src={card.activeImage}
          alt={product.name}
          fill
          // Matches the grid this card sits in: two up on phones, three on
          // tablets, four from `lg`.
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          // Tighter inset than the listing card's: the product should fill the
          // frame it is given rather than float in the middle of it.
          className="object-contain p-3 transition-transform duration-500 motion-safe:group-hover:scale-[1.03] sm:p-4"
        />

        {savingLabel ? (
          <span className="absolute left-0 top-3 z-20 bg-foreground px-2.5 py-1 font-label text-[10px] uppercase tracking-[0.14em] text-background">
            {savingLabel}
          </span>
        ) : null}

        <button
          type="button"
          onClick={card.toggleWishlist}
          aria-label={
            card.inWishlist
              ? t('productCardRegular.removeFromWishlist')
              : t('productCardRegular.addToWishlist')
          }
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center bg-card/90 text-foreground shadow-sm transition-opacity duration-200 hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Heart
            className={cn(
              'h-4 w-4',
              card.inWishlist && 'fill-foreground text-foreground',
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <Link
          href={`/products/${product.slug}`}
          className="font-title text-sm leading-snug text-foreground transition-colors hover:text-muted-foreground"
        >
          {product.name}
        </Link>

        {card.swatchOptions.length > 0 ? (
          <ColorSwatches
            options={card.swatchOptions}
            value={card.selectedColor?.value}
            onChange={card.selectColor}
            onPreview={card.selectColor}
            size="sm"
            className="mt-2.5"
            label={t('common.colourOptionsFor', { product: product.name })}
          />
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
          <span className="font-price text-sm text-foreground">
            {formatPrice(card.activePrice)}
          </span>
          {card.hasDiscount ? (
            <span className="font-caption text-xs text-subtle-foreground line-through">
              {formatPrice(card.comparePrice as number)}
            </span>
          ) : null}
        </div>

        {/*
          Pushed to the bottom of the body with a minimum gap above it, so a
          card without swatches still lines its CTA up with the ones that have
          them instead of leaving a hole mid-card.
        */}
        <div className="mt-auto pt-3.5">
          <button
            type="button"
            onClick={card.addToBag}
            disabled={card.isOutOfStock}
            className={cn(
              PRODUCT_CARD_CTA,
              'w-full',
              card.isOutOfStock &&
                'cursor-not-allowed text-subtle-foreground shadow-none hover:shadow-none',
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            {card.isOutOfStock
              ? t('productCardRegular.outOfStock')
              : t('productCardRegular.addToBag')}
          </button>
        </div>
      </div>
    </article>
  );
}
