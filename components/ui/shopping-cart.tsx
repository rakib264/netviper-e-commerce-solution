'use client';

import CartActions from '@/components/cart/CartActions';
import CartDealsPanel from '@/components/cart/CartDealsPanel';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useHydration } from '@/hooks/use-hydration';
import {
  reloadCartFromStorage,
  removeFromCart,
  toggleCart,
  updateQuantity,
} from '@/lib/store/slices/cartSlice';
import { addToWishlist, loadWishlistFromStorage } from '@/lib/store/slices/wishlistSlice';
import { RootState } from '@/lib/store/store';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Heart, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

type CartLineItem = RootState['cart']['items'][number];

/**
 * The cart drawer.
 *
 * Laid out as a flex column of four bands — header, deals, items, summary —
 * where only the item list scrolls. Two things fall out of that:
 *
 * - The panel is sized to its content up to the viewport height, so with one
 *   line item the summary sits directly beneath it. The old drawer was always
 *   full height, which is what left a screen of dead white between a single
 *   item and a flat summary.
 * - Once the content does exceed the viewport, `min-h-0` on the scroll region
 *   lets it give way rather than pushing the summary past the bottom edge, so
 *   the summary and the checkout CTA stay put at any item count.
 *
 * Under `sm` it fills the viewport as a sheet; above it, a right-hand drawer.
 */
export default function ShoppingBasket() {
  const dispatch = useDispatch();
  const {
    items,
    isOpen,
    shippingCost,
    tax,
    discount,
    couponCode,
    dealDiscount,
    dealProgress,
    dealsSyncing,
    confirmedItems,
  } = useSelector((state: RootState) => state.cart);
  const isHydrated = useHydration();
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => dispatch(toggleCart()), [dispatch]);
  // The drawer takes focus itself rather than handing it to whichever control
  // happens to come first in the header — that is `View Cart`, a link out of
  // the cart, and it is not what opening the cart is asking about.
  useFocusTrap(panelRef, isHydrated && isOpen, close, 'container');

  useEffect(() => {
    // Load cart and wishlist from localStorage on mount
    dispatch(reloadCartFromStorage());
    dispatch(loadWishlistFromStorage());
  }, [dispatch]);

  // Gift lines are the deal's, not the customer's, so they sit after the lines
  // that were actually chosen.
  const orderedItems = useMemo(
    () => [...items.filter((item) => !item.isGift), ...items.filter((item) => item.isGift)],
    [items]
  );

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // One count, used by the header and the subtotal row alike: what the customer
  // chose, which is also what the subtotal sums. Counting the gift line in the
  // header and not in the subtotal read as an arithmetic error — two figures a
  // line apart disagreeing about the same cart — and a free line is the deal's,
  // not something the customer put in the bag.
  const paidItemCount = items.reduce((count, item) => count + (item.isGift ? 0 : item.quantity), 0);
  const totalSavings = discount + dealDiscount;
  const finalTotal = Math.max(0, subtotal + shippingCost + tax - totalSavings);

  /**
   * A line whose quantity the server has not confirmed yet. Derived from the
   * pre-change snapshot the slice keeps, so exactly the line that was clicked
   * shows a skeleton — not every line on every sync.
   */
  const isAwaitingSync = (item: CartLineItem) => {
    if (!dealsSyncing || !confirmedItems) return false;
    const previous = confirmedItems.find(
      (entry) => entry.id === item.id && entry.variant === item.variant
    );
    return !previous || previous.quantity !== item.quantity;
  };

  const handleQuantityChange = (item: CartLineItem, quantity: number) => {
    if (item.lockedQty) return;
    if (quantity <= 0) {
      dispatch(removeFromCart({ id: item.id, variant: item.variant }));
    } else {
      dispatch(updateQuantity({ id: item.id, variant: item.variant, quantity }));
    }
  };

  const handleMoveToWishlist = (item: CartLineItem) => {
    if (item.isGift) return;
    dispatch(
      addToWishlist({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        inStock: true,
      })
    );
    dispatch(removeFromCart({ id: item.id, variant: item.variant }));
  };

  if (!isHydrated) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            onClick={close}
            suppressHydrationWarning
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('cart.title')}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-0 z-[60] flex flex-col bg-card outline-none sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-full sm:max-w-md sm:overflow-hidden sm:rounded-lg sm:border sm:border-border sm:shadow-2xl"
            suppressHydrationWarning
          >
            {/* ── Header ─────────────────────────────────────────────────
                Title, count and both utility actions on one row. The count sits
                on the title's baseline rather than under it, and `View Cart` /
                `Clear Cart` come in from the row they used to own below — three
                bands' worth of chrome folded into one, so the item list gets
                the height back. */}
            <header className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-3 py-2 sm:px-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
                <ShoppingBag size={15} className="text-primary-foreground" />
              </span>
              <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <h2 className="truncate font-title text-sm font-semibold text-foreground">
                  {t('cart.title')}
                </h2>
                <span className="shrink-0 font-caption text-xs text-muted-foreground">
                  {paidItemCount > 0 ? tPlural('cart.itemCount', paidItemCount) : t('cart.empty')}
                </span>
              </div>
              {items.length > 0 && <CartActions layout="inline" itemCount={paidItemCount} />}
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('common.close')}
                onClick={close}
                className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X size={16} />
              </Button>
            </header>

            {items.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 py-14 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                  <ShoppingBag size={28} className="text-muted-foreground" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-title text-base font-semibold text-foreground">
                    {t('cart.empty')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('cart.emptyDescription')}</p>
                </div>
                <Link href="/products" className="w-full max-w-xs">
                  <Button onClick={close} variant="outline" className="w-full">
                    {t('cart.continueShopping')}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* ── Deals ────────────────────────────────────────────────
                    A fixed band, not part of the scroll region: the rail is one
                    card tall whatever the deal count, and scrolling the items
                    should not push the customer's live progress out of view. */}
                {dealProgress.length > 0 && (
                  <div
                    data-band="deals"
                    className="shrink-0 border-b border-border bg-background px-4 py-2 sm:px-5"
                  >
                    <CartDealsPanel />
                  </div>
                )}

                {/* ── Items ────────────────────────────────────────────────
                    The only band that scrolls, so it absorbs whatever the three
                    fixed bands leave. `min-h-0` is what lets it give way rather
                    than pushing the summary past the bottom edge, which is how
                    the summary and the CTA stay put at any item count.

                    `overflow-x-hidden` is load-bearing: setting only
                    `overflow-y` leaves the computed `overflow-x` auto too, so a
                    wide line could drag this column sideways. */}
                <ul
                  data-band="items"
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-2.5 sm:px-4"
                >
                  {orderedItems.map((item) => (
                    <li
                      key={`${item.id}-${item.variant || 'default'}-${item.isGift ? 'gift' : 'own'}`}
                    >
                      <CartLine
                        item={item}
                        pending={isAwaitingSync(item)}
                        onQuantityChange={handleQuantityChange}
                        onSave={handleMoveToWishlist}
                        onRemove={() =>
                          dispatch(
                            removeFromCart({
                              id: item.id,
                              variant: item.variant,
                            })
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>

                {/* ── Summary ────────────────────────────────────────────── */}
                <footer className="shrink-0 border-t border-border bg-muted px-4 py-3 sm:px-5">
                  <div className="space-y-1.5" aria-live="polite">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('cart.subtotalWithCount', { count: paidItemCount })}
                      </span>
                      <span className="font-price text-sm font-medium text-foreground">
                        {formatPrice(subtotal)}
                      </span>
                    </div>

                    {shippingCost > 0 && (
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">{t('shoppingCart.shipping')}</span>
                        <span className="font-price text-sm font-medium text-foreground">
                          {formatPrice(shippingCost)}
                        </span>
                      </div>
                    )}

                    {tax > 0 && (
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">{t('shoppingCart.tax')}</span>
                        <span className="font-price text-sm font-medium text-foreground">
                          {formatPrice(tax)}
                        </span>
                      </div>
                    )}

                    {dealDiscount > 0 && (
                      <div className="flex items-baseline justify-between text-sm text-primary-700">
                        <span>{t('cart.deals.discountLabel')}</span>
                        <span className="font-price font-medium">−{formatPrice(dealDiscount)}</span>
                      </div>
                    )}

                    {discount > 0 && (
                      <div className="flex items-baseline justify-between text-sm text-primary-700">
                        <span>
                          {t('shoppingCart.discountWithCode', {
                            code: couponCode ?? '',
                          })}
                        </span>
                        <span className="font-price font-medium">−{formatPrice(discount)}</span>
                      </div>
                    )}

                    {/* The savings figure rides on the Total's baseline instead
                        of taking a row of its own. It is the sum of the coupon
                        and the deals, so it belongs beside the one number that
                        has both subtracted rather than on either line. */}
                    <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-border pt-2">
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="font-title text-sm font-semibold text-foreground">
                          {t('cart.total')}
                        </span>
                        {totalSavings > 0 && (
                          <span className="truncate font-caption text-[11px] font-medium text-primary-700">
                            {t('cart.deals.youSaved', {
                              amount: formatPrice(totalSavings),
                            })}
                          </span>
                        )}
                      </span>
                      <span className="font-price text-xl font-bold leading-none text-foreground">
                        {formatPrice(finalTotal)}
                      </span>
                    </div>
                  </div>

                  <Link href="/checkout" className="mt-2.5 block">
                    <Button className="h-10 w-full rounded-md" onClick={close}>
                      {t('cart.checkout')}
                    </Button>
                  </Link>
                </footer>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * One cart line.
 *
 * A gift line is the same row with its controls removed: the deal owns the
 * quantity and the deal decides when it leaves, so there is no stepper and no
 * remove button to press.
 */
function CartLine({
  item,
  pending,
  onQuantityChange,
  onSave,
  onRemove,
}: {
  item: CartLineItem;
  pending: boolean;
  onQuantityChange: (item: CartLineItem, quantity: number) => void;
  onSave: (item: CartLineItem) => void;
  onRemove: () => void;
}) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const atMinimum = item.quantity <= 1;

  return (
    <article className="flex gap-2.5 rounded-md border border-border bg-card p-2.5">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-accent sm:h-[68px] sm:w-[68px]">
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag size={20} className="text-subtle-foreground" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 font-title text-sm font-medium leading-snug text-foreground">
              {item.name}
            </h4>
            {item.variant && (
              <p className="mt-0.5 font-caption text-xs text-muted-foreground">{item.variant}</p>
            )}
            {/* A combo is one line: the type and the piece count sit under the
                name instead of the cart listing each component as its own
                paid row. */}
            {item.itemType === 'combo_bundle' ? (
              <p className="mt-0.5 font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t(
                  item.comboType === 'bundle'
                    ? 'combos.badge.bundle'
                    : 'combos.badge.combo'
                )}
                {item.components?.length
                  ? ` · ${tPlural('combos.pieceCount', item.components.length)}`
                  : ''}
              </p>
            ) : null}
            {item.isGift ? (
              <p className="mt-1 font-caption text-xs text-subtle-foreground">
                {item.listPrice ? (
                  <span className="line-through">{formatPrice(item.listPrice)}</span>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 font-caption text-xs text-subtle-foreground">
                {formatPrice(item.price)} {t('shoppingCart.each')}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            {pending ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <p className="font-price text-sm font-semibold text-foreground">
                {formatPrice(item.price * item.quantity)}
              </p>
            )}
          </div>
        </div>

        {item.isGift ? (
          <div className="flex h-7 items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 font-caption text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              <Gift className="h-3 w-3" />
              {t('cart.deals.free')}
            </span>
            <span className="font-caption text-xs text-muted-foreground">×{item.quantity}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
              <button
                type="button"
                aria-label={t('shoppingCart.decreaseQuantity')}
                disabled={atMinimum}
                onClick={() => onQuantityChange(item, item.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus size={12} />
              </button>
              {/* Not a live region of its own — the footer's totals announce the
                  change, and two regions competing over one click is noise. */}
              <span className="flex h-7 min-w-8 items-center justify-center border-x border-border px-1 font-price text-sm font-semibold text-foreground">
                {item.quantity}
              </span>
              <button
                type="button"
                aria-label={t('shoppingCart.increaseQuantity')}
                disabled={item.quantity >= item.maxQuantity}
                onClick={() => onQuantityChange(item, item.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Low emphasis by design: these are exits, not the point of the row. */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('shoppingCart.save')}
                title={t('shoppingCart.save')}
                onClick={() => onSave(item)}
                className="h-7 w-7 p-0 text-subtle-foreground hover:bg-accent hover:text-foreground"
              >
                <Heart size={13} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('shoppingCart.remove')}
                title={t('shoppingCart.remove')}
                onClick={onRemove}
                className="h-7 w-7 p-0 text-subtle-foreground hover:bg-destructive-50 hover:text-destructive-700"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
