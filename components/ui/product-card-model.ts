'use client';

import {
  addToCart,
} from '@/lib/store/slices/cartSlice';
import {
  addToWishlist,
  removeFromWishlist,
} from '@/lib/store/slices/wishlistSlice';
import type { ColorSwatchOption } from '@/components/ui/color-swatches';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Everything a product card has to work out before it can paint.
 *
 * Two cards now need it — the listing card and the event card — and the logic
 * is the part that is easy to get subtly wrong: which colour is selected, which
 * image that colour implies, which price and stock count come with it, and what
 * goes in the cart. Extracting it keeps the two cards free to look different
 * without drifting in behaviour.
 */
export interface ProductCardProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  averageRating?: number;
  totalReviews?: number;
  quantity?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isLimitedEdition?: boolean;
  category?: {
    name: string;
    slug: string;
  };
  shortDescription?: string;
  images?: string[];
  variants?: Array<{
    name: string;
    value: string;
    price?: number;
    sku?: string;
    quantity?: number;
    image?: string;
  }>;
  productSize?: string[];
}

export const PLACEHOLDER_IMAGE = '/placeholder-product.jpg';

const SWATCH_HEX: Record<string, string> = {
  black: '#1A1A1A',
  charcoal: '#3A3A38',
  graphite: '#4A4A47',
  grey: '#8C8A85',
  gray: '#8C8A85',
  silver: '#C9C6BF',
  white: '#FFFFFF',
  ivory: '#F3EFE6',
  cream: '#F0E9DC',
  chalk: '#EDE9E1',
  beige: '#D9CBB3',
  sand: '#D2BE9C',
  taupe: '#B3A394',
  camel: '#B98A50',
  tan: '#C08A4E',
  cognac: '#8B4A2B',
  brown: '#6B4429',
  chocolate: '#4A2E1E',
  espresso: '#3B2519',
  burgundy: '#5C1F2B',
  wine: '#5C1F2B',
  plum: '#4E2438',
  red: '#8E1D2C',
  rose: '#C98B96',
  pink: '#D9A5B0',
  purple: '#4C3A5A',
  navy: '#1F2A44',
  blue: '#2C4A7C',
  denim: '#41618F',
  teal: '#2C5556',
  green: '#2E5339',
  olive: '#5A5B3F',
  gold: '#B8912F',
};

/** Colour names arrive as free text, so a literal hex wins and a name is looked up. */
export function resolveSwatchHex(value: string): string {
  const key = value.trim().toLowerCase();

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  if (SWATCH_HEX[key]) return SWATCH_HEX[key];

  const partialMatch = Object.keys(SWATCH_HEX).find((name) =>
    key.includes(name),
  );

  return partialMatch ? SWATCH_HEX[partialMatch] : '#D6D3CD';
}

/**
 * The one Add-to-Bag treatment, shared so the two cards cannot drift.
 *
 * Solid `bg-card` in both states: the button used to fade to `bg-muted` on
 * hover, which on a pale product image read as the control going transparent —
 * it looked broken rather than interactive. Hover is expressed as elevation and
 * a firmer border instead, which is the house language for a raised surface.
 */
export const PRODUCT_CARD_CTA = [
  'inline-flex h-11 items-center justify-center gap-2 border border-border/70 bg-card',
  'font-button text-sm text-foreground shadow-[0_1px_2px_rgba(26,26,26,0.06)]',
  'transition-[box-shadow,border-color,transform] duration-200 ease-out',
  'hover:border-foreground/25 hover:bg-card hover:shadow-[0_6px_16px_rgba(26,26,26,0.12)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
  'active:translate-y-[0.5px]',
].join(' ');

export interface ProductCardModel {
  colorOptions: Array<{
    value: string;
    image?: string;
    price?: number;
    quantity?: number;
  }>;
  swatchOptions: ColorSwatchOption[];
  selectedColor?: { value: string; image?: string; price?: number; quantity?: number };
  selectColor: (value: string) => void;
  galleryImages: string[];
  activeImage: string;
  imageIndex: number;
  showImageNav: boolean;
  goToPreviousImage: () => void;
  goToNextImage: () => void;
  activePrice: number;
  comparePrice?: number;
  hasDiscount: boolean;
  /** Whole-percent saving against the compare price, 0 when there is none. */
  discountPercent: number;
  isOutOfStock: boolean;
  inWishlist: boolean;
  toggleWishlist: () => void;
  addToBag: () => void;
}

export function useProductCardModel(
  product: ProductCardProduct,
): ProductCardModel {
  const dispatch = useDispatch();
  const wishlistItems = useSelector(
    (state: { wishlist?: { items?: Array<{ id: string }> } }) =>
      state.wishlist?.items || [],
  );
  const inWishlist = wishlistItems.some((item) => item.id === product._id);

  const colorOptions = useMemo(() => {
    const seen = new Set<string>();

    return (product.variants || [])
      .filter((variant) => /colou?r/i.test(variant.name || ''))
      .filter((variant) => {
        const key = (variant.value || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((variant) => ({
        value: variant.value,
        image: variant.image,
        price: variant.price,
        quantity: variant.quantity,
      }));
  }, [product.variants]);

  const baseImages = useMemo(() => {
    const list = [product.thumbnailImage, ...(product.images || [])].filter(
      Boolean,
    ) as string[];
    return Array.from(new Set(list));
  }, [product.thumbnailImage, product.images]);

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  const selectedColor = colorOptions[selectedColorIndex];

  const galleryImages = useMemo(() => {
    const colorImage = selectedColor?.image;

    const list = colorImage
      ? [colorImage, ...baseImages.filter((image) => image !== colorImage)]
      : baseImages;

    return list.length > 0 ? list : [PLACEHOLDER_IMAGE];
  }, [baseImages, selectedColor?.image]);

  useEffect(() => {
    setImageIndex(0);
  }, [selectedColorIndex]);

  const activeImage = galleryImages[imageIndex] || galleryImages[0];
  const activePrice = selectedColor?.price ?? product.price;
  const hasDiscount =
    typeof product.comparePrice === 'number' &&
    product.comparePrice > activePrice;
  const discountPercent = hasDiscount
    ? Math.round(
        (((product.comparePrice as number) - activePrice) /
          (product.comparePrice as number)) *
          100,
      )
    : 0;

  const availableStock = selectedColor?.quantity ?? product.quantity;
  const isOutOfStock = availableStock !== undefined && availableStock <= 0;

  const swatchOptions = useMemo<ColorSwatchOption[]>(
    () =>
      colorOptions.map((color) => ({
        value: color.value,
        label: color.value,
        color: resolveSwatchHex(color.value),
      })),
    [colorOptions],
  );

  const selectColor = useCallback(
    (value: string) => {
      const index = colorOptions.findIndex((color) => color.value === value);
      if (index >= 0) setSelectedColorIndex(index);
    },
    [colorOptions],
  );

  const goToPreviousImage = useCallback(() => {
    setImageIndex(
      (current) => (current - 1 + galleryImages.length) % galleryImages.length,
    );
  }, [galleryImages.length]);

  const goToNextImage = useCallback(() => {
    setImageIndex((current) => (current + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const toggleWishlist = useCallback(() => {
    if (inWishlist) {
      dispatch(removeFromWishlist(product._id));
      return;
    }

    dispatch(
      addToWishlist({
        id: product._id,
        name: product.name,
        price: activePrice,
        image: activeImage,
        comparePrice: product.comparePrice,
        inStock: !isOutOfStock,
      }),
    );
  }, [
    activeImage,
    activePrice,
    dispatch,
    inWishlist,
    isOutOfStock,
    product._id,
    product.comparePrice,
    product.name,
  ]);

  const addToBag = useCallback(() => {
    if (isOutOfStock) return;

    dispatch(
      addToCart({
        id: product._id,
        name: product.name,
        price: activePrice,
        image: activeImage,
        quantity: 1,
        variant: selectedColor ? `Color: ${selectedColor.value}` : undefined,
        maxQuantity: availableStock && availableStock > 0 ? availableStock : 99,
      }),
    );
  }, [
    activeImage,
    activePrice,
    availableStock,
    dispatch,
    isOutOfStock,
    product._id,
    product.name,
    selectedColor,
  ]);

  return {
    colorOptions,
    swatchOptions,
    selectedColor,
    selectColor,
    galleryImages,
    activeImage,
    imageIndex,
    showImageNav: galleryImages.length > 1,
    goToPreviousImage,
    goToNextImage,
    activePrice,
    comparePrice: product.comparePrice,
    hasDiscount,
    discountPercent,
    isOutOfStock,
    inWishlist,
    toggleWishlist,
    addToBag,
  };
}
