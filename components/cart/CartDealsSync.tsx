'use client';

import { useCartDealsSync } from '@/hooks/use-cart-deals';
import { useComboCartSync } from '@/hooks/use-combo-cart-sync';

/**
 * Mount point for the cart's server syncs. Rendered once beside the cart
 * drawer so every page shares one recalculation loop.
 *
 * Two independent loops run here: the deals engine owns gift lines and the
 * threshold discount, and the combo validator owns the price and availability
 * of combo/bundle lines. Neither can add a paid line the customer did not ask
 * for — they only correct or withdraw what is already there.
 */
export default function CartDealsSync() {
  useCartDealsSync();
  useComboCartSync();
  return null;
}
