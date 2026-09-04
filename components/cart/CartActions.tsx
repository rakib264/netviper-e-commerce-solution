'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { clearCart } from '@/lib/store/slices/cartSlice';
import { cn } from '@/lib/utils';
import { ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

/**
 * The cart's two utility actions: leave for the full cart page, or empty the
 * cart. One behaviour, two layouts.
 *
 * - `strip` is the standalone row the `/cart` page puts above its item list.
 * - `inline` is the pair of quiet actions the drawer folds into its sticky
 *   header. A row of its own cost the drawer a full band plus a divider —
 *   height the item list needed more than these two links did.
 *
 * Either way the destructive action stays away from the checkout CTA: a
 * "clear cart" next to the one button the page wants pressed competes for the
 * same glance.
 *
 * Clearing confirms in place instead of opening a dialog: the drawer is already
 * a modal with its own focus trap, and stacking a second one over it to ask a
 * one-word question is heavier than the question deserves.
 */
export default function CartActions({
  itemCount,
  layout = 'strip',
  showViewCart = true,
  className,
}: {
  itemCount: number;
  layout?: 'strip' | 'inline';
  /** The `/cart` page is already the cart, so it hides this. */
  showViewCart?: boolean;
  className?: string;
}) {
  const dispatch = useDispatch();
  const { t, tPlural } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inline = layout === 'inline';

  // An armed confirm that the customer ignores disarms itself, so a stray click
  // minutes later cannot empty the cart.
  useEffect(() => {
    if (!confirming) return;
    confirmRef.current?.focus();
    timer.current = setTimeout(() => setConfirming(false), 6000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [confirming]);

  const viewCart = showViewCart ? (
    <Link
      href="/cart"
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm font-medium text-muted-foreground transition-colors',
        inline
          ? 'gap-1 px-1.5 py-1 font-caption text-[11px] hover:bg-accent hover:text-foreground'
          : 'gap-1.5 border border-border bg-card px-2.5 py-1 font-button text-xs hover:border-primary/40 hover:text-foreground'
      )}
    >
      {t('cart.viewCart')}
      <ArrowRight size={inline ? 12 : 13} />
    </Link>
  ) : null;

  const clearAction = (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 font-caption font-medium text-subtle-foreground transition-colors',
        inline
          ? 'rounded-sm px-1.5 py-1 text-[11px] hover:bg-destructive-50 hover:text-destructive-700'
          : 'text-xs hover:text-destructive-700'
      )}
    >
      <Trash2 size={inline ? 12 : 13} />
      {t('shoppingCart.clearCart')}
    </button>
  );

  const confirmGroup = (
    <span
      className={cn('flex shrink-0 items-center', inline ? 'gap-1.5' : 'gap-2')}
      role="group"
      aria-live="polite"
    >
      <span
        className={cn('font-caption text-muted-foreground', inline ? 'text-[11px]' : 'text-xs')}
      >
        {tPlural('cart.clearConfirm', itemCount)}
      </span>
      <button
        ref={confirmRef}
        type="button"
        onClick={() => {
          setConfirming(false);
          dispatch(clearCart());
        }}
        className={cn(
          'rounded-sm bg-destructive font-button font-semibold text-destructive-foreground transition-opacity hover:opacity-90',
          inline ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
        )}
      >
        {t('common.confirm')}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={cn(
          'font-caption font-medium text-muted-foreground transition-colors hover:text-foreground',
          inline ? 'text-[11px]' : 'text-xs'
        )}
      >
        {t('common.cancel')}
      </button>
    </span>
  );

  // Inline, the armed confirm takes over the whole action group: the header has
  // no room for the question alongside both actions, and `View Cart` is not
  // what is being asked about.
  if (inline) {
    return (
      <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
        {confirming ? (
          confirmGroup
        ) : (
          <>
            {viewCart}
            {clearAction}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5',
        className
      )}
    >
      {viewCart ?? <span aria-hidden="true" />}
      {confirming ? confirmGroup : clearAction}
    </div>
  );
}
