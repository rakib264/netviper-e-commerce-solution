'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import {
  comboAddToCartKey,
  toComboCartLine,
} from '@/components/combo-bundles/combo-presentation';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { addToCart, updateQuantity } from '@/lib/store/slices/cartSlice';
import type { RootState } from '@/lib/store/store';
import { cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * The single call to action for a combo/bundle.
 *
 * One click puts one line in the cart, whatever the offer contains. When the
 * line is already there the same button updates it, so a customer never has to
 * guess whether pressing it again adds a second copy — the label says which it
 * will do.
 */
export interface ComboAddToCartButtonProps {
  combo: ResolvedComboBundle;
  quantity?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export default function ComboAddToCartButton({
  combo,
  quantity = 1,
  className,
  size = 'md',
}: ComboAddToCartButtonProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const line = useSelector((state: RootState) =>
    state.cart.items.find(
      (item) => item.itemType === 'combo_bundle' && item.comboBundleId === combo._id,
    ),
  );

  const sellable = combo.inStock && combo.isActive && combo.isScheduleLive;
  const inCart = Boolean(line);

  const handleClick = () => {
    if (!sellable) return;

    if (line) {
      // Already in the cart: set the quantity rather than stacking another
      // line for the same offer.
      dispatch(
        updateQuantity({
          id: line.id,
          variant: line.variant,
          quantity: Math.max(1, Math.min(quantity, combo.maxUnits)),
        }),
      );
      return;
    }

    dispatch(addToCart(toComboCartLine(combo, quantity)));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!sellable}
      className={cn(
        // Rectangular by house rule, solid in both states, elevation as the
        // only hover change.
        'inline-flex w-full items-center justify-center gap-2.5 border border-foreground bg-foreground font-button uppercase tracking-[0.16em] text-background',
        'transition-[box-shadow,background-color,transform] duration-200 ease-out',
        'hover:bg-foreground/90 hover:shadow-[0_8px_20px_rgba(26,26,26,0.18)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        'active:translate-y-[0.5px]',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-subtle-foreground disabled:shadow-none',
        size === 'md' ? 'h-12 px-6 text-[0.6875rem]' : 'h-11 px-5 text-[0.625rem]',
        className,
      )}
    >
      <ShoppingBag className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {!sellable
        ? t('combos.soldOut')
        : inCart
          ? t('combos.updateCart')
          : t(comboAddToCartKey(combo.comboType))}
    </button>
  );
}
