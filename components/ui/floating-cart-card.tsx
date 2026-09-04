'use client';

import {
  useCurrency,
  useTranslation,
} from '@/components/providers/LocalizationProvider';
import { useHydration } from '@/hooks/use-hydration';
import { reloadCartFromStorage, toggleCart } from '@/lib/store/slices/cartSlice';
import type { RootState } from '@/lib/store/store';
import { cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Routes where a floating cart is redundant or intrusive: the cart and checkout
 * already show the same totals, and admin is a different product entirely.
 */
const HIDDEN_PREFIXES = ['/admin', '/cart', '/checkout', '/auth'];

/**
 * Persistent cart summary pinned to the right edge of the viewport.
 *
 * Vertically centred rather than corner-anchored so it lands in the same place
 * on a phone and a desktop, and so it never collides with the fixed mobile
 * bottom nav or the scroll-to-top button.
 */
export default function FloatingCartCard() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const isHydrated = useHydration();
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const { itemCount, total } = useSelector((state: RootState) => state.cart);

  useEffect(() => {
    dispatch(reloadCartFromStorage());
  }, [dispatch]);

  if (HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) return null;

  // The cart lives in localStorage, so rendering counts before hydration would
  // mismatch the server output.
  const count = isHydrated ? itemCount : 0;
  const amount = isHydrated ? total : 0;

  return (
    <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2">
      <button
        type="button"
        onClick={() => dispatch(toggleCart())}
        aria-label={`${t('cart.title')} — ${tPlural('cart.itemCount', count)}`}
        className={cn(
          'group flex w-[68px] flex-col items-stretch overflow-hidden',
          'rounded-l-xl border border-r-0 border-border bg-card text-foreground',
          'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]',
          'transition-transform duration-300 ease-out hover:-translate-x-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
          'md:w-[76px]',
        )}
      >
        {/* Icon block — carries the brand colour so the control reads as a CTA.
            No count badge here: the line below already spells the count out, and
            showing it twice in one 76px card is noise. */}
        <span className="flex items-center justify-center bg-primary py-3 md:py-3.5">
          <ShoppingBag
            className="h-[18px] w-[18px] stroke-[1.5] text-primary-foreground md:h-5 md:w-5"
            aria-hidden
          />
        </span>

        {/* Summary block */}
        <span className="flex flex-col items-center gap-0.5 px-2 py-2.5 md:py-3">
          <span className="font-caption text-[10px] uppercase leading-none tracking-[0.08em] text-subtle-foreground">
            {tPlural('cart.itemCount', count)}
          </span>
          <span className="font-price text-[12px] font-semibold leading-none tabular-nums text-foreground md:text-[13px]">
            {formatPrice(amount)}
          </span>
        </span>
      </button>
    </div>
  );
}
