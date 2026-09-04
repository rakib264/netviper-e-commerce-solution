'use client';

import { ShowcasePrice } from '@/components/product-showcase/Price';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { ColorSwatches, type ColorSwatchOption } from '@/components/ui/color-swatches';
import type {
  ShowcaseProduct,
  ShowcaseProductVariant,
} from '@/lib/product-showcase/types';
import { useAddToCart } from '@/components/product-showcase/cards/use-add-to-cart';
import {
  addToWishlist,
  removeFromWishlist,
} from '@/lib/store/slices/wishlistSlice';
import { cn } from '@/lib/utils';
import { Heart, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

interface CardProps {
  product: ShowcaseProduct;
  className?: string;
}

/** Shared add-to-cart CTA. Rectangular by design — the house style for actions. */
const CTA_BASE =
  'inline-flex w-full items-center justify-center gap-2 rounded-none px-4 font-button text-[11px] uppercase tracking-[0.14em] transition-[background-color,color,opacity,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const CTA_SOLID =
  'h-11 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary';

const CTA_SURFACE =
  'h-11 bg-card text-foreground shadow-sm hover:bg-muted active:bg-muted';

/**
 * Reveal-on-hover wrapper for the desktop CTA. Motion is limited to opacity and
 * a 4px lift — both compositor-only properties, so the rail stays smooth while
 * scrolling.
 */
const CTA_REVEAL =
  'pointer-events-none absolute inset-x-3 bottom-3 z-20 hidden md:block';
const CTA_REVEAL_INNER =
  'pointer-events-auto translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none';

function toSwatchOptions(variants: ShowcaseProductVariant[]): ColorSwatchOption[] {
  return variants.map((variant) => ({
    value: variant.value,
    label: variant.label,
    color: variant.color,
  }));
}

function useProductMedia(product: ShowcaseProduct) {
  // Memoised: `product.variants || []` allocated a fresh array on every render,
  // which invalidated every downstream useMemo that depended on it.
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [selectedColor, setSelectedColor] = useState('');
  /**
   * The hover frame is a second full-size request per card. It is only mounted
   * once the pointer has actually reached the card, which keeps the initial rail
   * paint to one image per product and skips it entirely on touch devices.
   */
  const [hoverArmed, setHoverArmed] = useState(false);

  const { primary, secondary } = useMemo(() => {
    const match = variants.find((variant) => variant.value === selectedColor);
    if (match?.image) {
      const rest = product.images.filter((src) => src !== match.image);
      return {
        primary: match.image,
        secondary: rest[0] || product.images[1] || match.image,
      };
    }
    const images = product.images.length
      ? product.images
      : ['/placeholder-product.jpg'];
    return { primary: images[0], secondary: images[1] || images[0] };
  }, [product.images, variants, selectedColor]);

  const price =
    variants.find((variant) => variant.value === selectedColor)?.price ??
    product.price;

  const swatches = useMemo(() => toSwatchOptions(variants), [variants]);
  const armHover = useCallback(() => setHoverArmed(true), []);
  const hasSecondary = secondary !== primary;

  return {
    variants,
    swatches,
    primary,
    secondary,
    hasSecondary,
    hoverArmed,
    armHover,
    price,
    selectedColor,
    setSelectedColor,
  };
}

/** Crossfading primary/hover imagery, shared by all three card styles. */
function CardMedia({
  primary,
  secondary,
  hasSecondary,
  hoverArmed,
  alt,
  sizes,
}: {
  primary: string;
  secondary: string;
  hasSecondary: boolean;
  hoverArmed: boolean;
  alt: string;
  sizes: string;
}) {
  return (
    <>
      <Image
        src={primary}
        alt={alt}
        fill
        sizes={sizes}
        className={cn(
          'object-cover object-center transition-[opacity,transform] duration-700 ease-out',
          hasSecondary && hoverArmed
            ? 'group-hover:opacity-0'
            : 'group-hover:scale-[1.03]',
        )}
      />
      {hasSecondary && hoverArmed ? (
        <Image
          src={secondary}
          alt=""
          fill
          sizes={sizes}
          loading="lazy"
          aria-hidden="true"
          className="object-cover object-center opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
        />
      ) : null}
    </>
  );
}

function ProductBadges({ badges }: { badges?: ShowcaseProduct['badges'] }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-col items-start gap-1.5">
      {badges.map((item) => (
        <Badge
          key={item.text}
          style={{ backgroundColor: item.color }}
          className="rounded-none border-0 font-label text-[10px] tracking-[0.08em] text-primary-foreground"
        >
          {item.text}
        </Badge>
      ))}
    </div>
  );
}

function statusLabelFor(product: ShowcaseProduct) {
  if (product.isNewArrival) return 'New';
  if (product.isFeatured) return 'Bestseller';
  return product.badges?.[0]?.text;
}

/* ── Showcase: square media, category kicker, surface CTA ───────────────── */

function ShowcaseProductCardImpl({ product, className }: CardProps) {
  const media = useProductMedia(product);
  const handleAdd = useAddToCart(product, media.price, media.primary);

  return (
    <article
      className={cn('group flex h-full flex-col bg-transparent', className)}
      onPointerEnter={media.armHover}
    >
      <div className="relative overflow-hidden bg-muted">
        <Link href={product.href} aria-label={product.name} className="block">
          <AspectRatio ratio={1} className="overflow-hidden">
            <CardMedia
              primary={media.primary}
              secondary={media.secondary}
              hasSecondary={media.hasSecondary}
              hoverArmed={media.hoverArmed}
              alt={product.name}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            />
          </AspectRatio>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 z-20">
          <ProductBadges badges={product.badges} />
        </div>

        {/* Mobile: always-visible icon action, so the CTA never needs a hover. */}
        <div className="absolute bottom-3 right-3 z-20 md:hidden">
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${product.name} to cart`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>

        <div className={CTA_REVEAL}>
          <button
            type="button"
            onClick={handleAdd}
            className={cn(CTA_BASE, CTA_SURFACE, CTA_REVEAL_INNER)}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <Link
          href={product.category.link}
          className="font-label text-[11px] uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
        >
          {product.category.label}
        </Link>
        <Link
          href={product.href}
          className="mt-1.5 font-title text-sm leading-snug text-foreground underline-offset-4 transition-colors hover:text-muted-foreground"
        >
          {product.name}
        </Link>
        <ShowcasePrice
          price={media.price}
          comparePrice={product.comparePrice}
          className="mt-1.5 text-sm"
          saleClassName="text-foreground"
          regularClassName="text-foreground"
        />
        {media.swatches.length ? (
          <ColorSwatches
            options={media.swatches}
            value={media.selectedColor}
            onChange={media.setSelectedColor}
            onPreview={media.setSelectedColor}
            className="mt-3 -ml-1.5"
            label={`Colour options for ${product.name}`}
          />
        ) : null}
      </div>
    </article>
  );
}

/* ── Luxury: portrait media, wishlist, solid CTA ────────────────────────── */

function LuxuryProductCardImpl({ product, className }: CardProps) {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state: any) => state.wishlist?.items || []);
  const inWishlist = wishlistItems.some((item: any) => item.id === product._id);
  const media = useProductMedia(product);
  const handleAdd = useAddToCart(product, media.price, media.primary);
  const status = statusLabelFor(product);

  const toggleWishlist = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (inWishlist) {
        dispatch(removeFromWishlist(product._id));
        return;
      }
      dispatch(
        addToWishlist({
          id: product._id,
          name: product.name,
          price: product.price,
          image: media.primary,
          inStock: true,
        }),
      );
    },
    [dispatch, inWishlist, media.primary, product._id, product.name, product.price],
  );

  return (
    <article
      className={cn('group flex h-full flex-col bg-transparent', className)}
      onPointerEnter={media.armHover}
    >
      <div className="relative overflow-hidden bg-muted">
        <Link href={product.href} aria-label={product.name} className="block">
          <AspectRatio ratio={4 / 5} className="overflow-hidden">
            <CardMedia
              primary={media.primary}
              secondary={media.secondary}
              hasSecondary={media.hasSecondary}
              hoverArmed={media.hoverArmed}
              alt={product.name}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            />
          </AspectRatio>
        </Link>

        <button
          type="button"
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={inWishlist}
          onClick={toggleWishlist}
          className="absolute right-2 top-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-none text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart
            className={cn('h-[18px] w-[18px]', inWishlist && 'fill-foreground text-foreground')}
            strokeWidth={1.3}
          />
        </button>

        <div className={CTA_REVEAL}>
          <button
            type="button"
            onClick={handleAdd}
            className={cn(CTA_BASE, CTA_SOLID, CTA_REVEAL_INNER)}
          >
            Add to Cart
          </button>
        </div>
        <div className="absolute inset-x-3 bottom-3 z-20 md:hidden">
          <button
            type="button"
            onClick={handleAdd}
            className={cn(CTA_BASE, CTA_SOLID)}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        {status ? (
          <p className="font-label text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {status}
          </p>
        ) : null}
        <Link
          href={product.href}
          className="mt-1.5 font-title text-sm leading-snug text-foreground underline-offset-4 transition-colors hover:text-muted-foreground"
        >
          {product.name}
        </Link>
        <ShowcasePrice
          price={media.price}
          comparePrice={product.comparePrice}
          className="mt-1.5 text-sm"
          saleClassName="text-foreground"
          regularClassName="text-foreground"
        />
        {media.swatches.length ? (
          <ColorSwatches
            options={media.swatches}
            value={media.selectedColor}
            onChange={media.setSelectedColor}
            onPreview={media.setSelectedColor}
            className="mt-3 -ml-1.5"
            label={`Colour options for ${product.name}`}
          />
        ) : null}
      </div>
    </article>
  );
}

/* ── Compact: square media, denser type ─────────────────────────────────── */

function CompactProductCardImpl({ product, className }: CardProps) {
  const media = useProductMedia(product);
  const handleAdd = useAddToCart(product, media.price, media.primary);
  const status = statusLabelFor(product);

  return (
    <article
      className={cn('group flex h-full flex-col bg-transparent', className)}
      onPointerEnter={media.armHover}
    >
      <div className="relative overflow-hidden bg-muted">
        <Link href={product.href} aria-label={product.name} className="block">
          <AspectRatio ratio={1} className="overflow-hidden">
            <CardMedia
              primary={media.primary}
              secondary={media.secondary}
              hasSecondary={media.hasSecondary}
              hoverArmed={media.hoverArmed}
              alt={product.name}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          </AspectRatio>
        </Link>

        <div className={CTA_REVEAL}>
          <button
            type="button"
            onClick={handleAdd}
            className={cn(CTA_BASE, CTA_SOLID, CTA_REVEAL_INNER)}
          >
            Add to Cart
          </button>
        </div>
        <div className="absolute inset-x-2.5 bottom-2.5 z-20 md:hidden">
          <button
            type="button"
            onClick={handleAdd}
            className={cn(CTA_BASE, CTA_SOLID)}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        {status ? (
          <p className="font-label text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {status}
          </p>
        ) : null}
        <Link
          href={product.href}
          className="mt-1 line-clamp-2 font-title text-sm leading-snug text-foreground underline-offset-4 transition-colors hover:text-muted-foreground"
        >
          {product.name}
        </Link>
        <ShowcasePrice
          price={media.price}
          comparePrice={product.comparePrice}
          className="mt-1.5 text-sm"
          saleClassName="text-foreground"
          regularClassName="text-foreground"
        />
        {media.swatches.length ? (
          <ColorSwatches
            options={media.swatches}
            value={media.selectedColor}
            onChange={media.setSelectedColor}
            onPreview={media.setSelectedColor}
            size="sm"
            className="mt-2.5 -ml-1"
            label={`Colour options for ${product.name}`}
          />
        ) : null}
      </div>
    </article>
  );
}

/**
 * Memoised: the rail's scroll-progress state lives in the carousel, and without
 * this every product card re-rendered on each scroll frame.
 */
export const ShowcaseProductCard = memo(ShowcaseProductCardImpl);
export const LuxuryProductCard = memo(LuxuryProductCardImpl);
export const CompactProductCard = memo(CompactProductCardImpl);
