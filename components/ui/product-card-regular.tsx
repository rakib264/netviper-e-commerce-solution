"use client";

import { ColorSwatches } from "@/components/ui/color-swatches";
import {
  PRODUCT_CARD_CTA,
  useProductCardModel,
  type ProductCardProduct,
} from "@/components/ui/product-card-model";
import {
  useTranslation,
  useCurrency,
} from "@/components/providers/LocalizationProvider";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Heart, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/** Re-exported so the many callers that import `Product` from here still can. */
export type Product = ProductCardProduct;

interface ProductCardRegularProps {
  product: Product;
  className?: string;
}

export default function ProductCardRegular({
  product,
  className = "",
}: ProductCardRegularProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const card = useProductCardModel(product);

  const badgeLabel = product.isLimitedEdition
    ? t('product.badgeLimitedEdition')
    : product.isFeatured
      ? t('product.badgeBestseller')
      : product.isNewArrival
        ? t('product.badgeNew')
        : null;

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10"
          aria-label={product.name}
        />

        {/*
          Descriptive rather than bare: an alt of just the product name repeats
          the link text next to it, where "<name> — <category>" tells a screen
          reader (and an image crawler) what the thing actually is.
        */}
        <Image
          src={card.activeImage}
          alt={
            product.category?.name
              ? `${product.name} — ${product.category.name}`
              : product.name
          }
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.03]"
        />

        {badgeLabel && (
          <span className="absolute left-3 top-3 z-20 bg-card px-2.5 py-1 font-label text-[10px] uppercase tracking-[0.08em] text-foreground shadow-sm">
            {badgeLabel}
          </span>
        )}

        <button
          type="button"
          onClick={card.toggleWishlist}
          aria-label={card.inWishlist ? t('productCardRegular.removeFromWishlist') : t('productCardRegular.addToWishlist')}
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center bg-card/90 text-foreground opacity-0 shadow-sm transition-opacity duration-200 hover:bg-card focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              card.inWishlist ? "fill-foreground text-foreground" : "text-foreground",
            )}
          />
        </button>

        {card.showImageNav && (
          <>
            <button
              type="button"
              onClick={card.goToPreviousImage}
              aria-label={t('productCardRegular.previousImage')}
              className="absolute left-1 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-foreground transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={card.goToNextImage}
              aria-label={t('productCardRegular.nextImage')}
              className="absolute right-1 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-foreground transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={card.addToBag}
          disabled={card.isOutOfStock}
          className={cn(
            PRODUCT_CARD_CTA,
            "absolute inset-x-3 bottom-3 z-20",
            // Revealed on hover on pointer devices; always available on touch.
            "md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100",
            "md:transition-[box-shadow,border-color,transform,opacity] md:duration-200",
            card.isOutOfStock &&
              "cursor-not-allowed text-subtle-foreground shadow-none hover:shadow-none",
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          {card.isOutOfStock ? t('productCardRegular.outOfStock') : t('productCardRegular.addToBag')}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center pt-4 text-center">
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-title leading-snug text-foreground transition-colors hover:text-muted-foreground"
        >
          {product.name}
        </Link>

        {card.swatchOptions.length > 0 && (
          <ColorSwatches
            options={card.swatchOptions}
            value={card.selectedColor?.value}
            onChange={card.selectColor}
            onPreview={card.selectColor}
            className="mt-3 justify-center"
            label={t('common.colourOptionsFor', { product: product.name })}
          />
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-sm font-price text-foreground">
            {formatPrice(card.activePrice)}
          </span>
          {card.hasDiscount && (
            <span className="text-sm font-caption text-subtle-foreground line-through">
              {formatPrice(product.comparePrice as number)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
