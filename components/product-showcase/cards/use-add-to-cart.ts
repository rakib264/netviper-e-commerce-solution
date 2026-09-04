'use client';

import type { ShowcaseProduct } from '@/lib/product-showcase/types';
import { addToCart } from '@/lib/store/slices/cartSlice';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

/**
 * The one place a showcase surface builds a cart payload.
 *
 * Extracted from `ProductCards` so the split-media panel can add to cart
 * without importing all three card styles — the panel renders its own card, and
 * pulling the grid cards in with it would ship three unused components to every
 * page carrying a split campaign.
 *
 * The cart slice raises its own toast from inside the reducer, so callers do
 * not announce the result themselves.
 */
export function useAddToCart(
  product: ShowcaseProduct,
  price: number,
  image: string,
) {
  const dispatch = useDispatch();
  return useCallback(
    (event: React.MouseEvent) => {
      // These buttons sit inside or beside a product link.
      event.preventDefault();
      event.stopPropagation();
      dispatch(
        addToCart({
          id: product._id,
          name: product.name,
          price,
          image,
          quantity: 1,
          maxQuantity: 999,
        }),
      );
    },
    [dispatch, image, price, product._id, product.name],
  );
}

export default useAddToCart;
