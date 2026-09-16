'use client';

import BackButton from '@/components/ui/back-button';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useHydration } from '@/hooks/use-hydration';
import {
    applyCoupon,
    reloadCartFromStorage,
    removeCoupon,
    removeFromCart,
    updateQuantity
} from '@/lib/store/slices/cartSlice';
import { addToWishlist, loadWishlistFromStorage } from '@/lib/store/slices/wishlistSlice';
import { RootState } from '@/lib/store/store';
import { formatEuroCurrency } from '@/lib/utils';
import CartActions from '@/components/cart/CartActions';
import CartDealsPanel from '@/components/cart/CartDealsPanel';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Gift,
    Heart,
    Minus,
    Package,
    Plus,
    Shield,
    ShoppingBag,
    Tag,
    Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function CartPageClient() {
  const { t, tPlural } = useTranslation();
  const dispatch = useDispatch();
  const { items, total, itemCount, discount, dealDiscount, couponCode: appliedCoupon } = useSelector((state: RootState) => state.cart);
  const isHydrated = useHydration();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load cart and wishlist from localStorage on mount
    dispatch(reloadCartFromStorage());
    dispatch(loadWishlistFromStorage());
  }, [dispatch]);

  const handleQuantityChange = (id: string, variant: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeFromCart({ id, variant }));
    } else {
      dispatch(updateQuantity({ id, variant, quantity }));
    }
  };

  const handleMoveToWishlist = (item: any) => {
    dispatch(addToWishlist({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      inStock: true
    }));
    dispatch(removeFromCart({ id: item.id, variant: item.variant }));
  };

  const handleCouponApply = async () => {
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setError('');

    try {
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal })
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(applyCoupon({ code: couponCode, discount: data.discount }));
        setCouponCode('');
      } else {
        setError(data.error || t('cart.messages.invalidCouponCode'));
      }
    } catch (error) {
      setError(t('cart.messages.failedToApplyCoupon'));
    } finally {
      setCouponLoading(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalSavings = discount + dealDiscount;
  const finalTotal = Math.max(0, subtotal - totalSavings);
  // Gift lines are the deal's, not the customer's, so they sit last.
  const orderedItems = [
    ...items.filter((item) => !item.isGift),
    ...items.filter((item) => item.isGift),
  ];

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-card">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-16 md:mt-20 mb-20 md:mb-0">
          <div className="animate-pulse space-y-6">
            <div className="space-y-4 mb-8">
              <div className="h-8 w-8 bg-primary-light rounded-lg"></div>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-primary-light rounded-xl"></div>
                <div className="h-8 bg-primary-light rounded-lg w-1/3"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 bg-primary-light border-0">
                    <div className="flex space-x-4">
                      <div className="w-20 h-20 bg-primary-100 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-primary-100 rounded w-3/4"></div>
                        <div className="h-3 bg-primary-100 rounded w-1/2"></div>
                        <div className="h-3 bg-primary-100 rounded w-1/4"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="lg:col-span-1">
                <Card className="p-4 bg-primary-light border-0">
                  <div className="space-y-4">
                    <div className="h-6 bg-primary-100 rounded w-1/2"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-primary-100 rounded"></div>
                      <div className="h-4 bg-primary-100 rounded w-3/4"></div>
                    </div>
                    <div className="h-10 bg-primary-100 rounded-lg"></div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Header />

      <div className="container mx-auto px-4 py-4 md:py-6 mt-16 md:mt-20 mb-20 md:mb-0">
        {/* Header with Back Button Above */}
        <div className="mb-6">
          {/* Back Button */}
          <div className="mb-3">
            <BackButton label={t('cart.back')} />
          </div>

          {/* Title Section */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <div>
                <h1 className="typography-section-title">
                  {t('cart.shoppingCart')}
                </h1>
                {itemCount > 0 && (
                  <p className="typography-caption text-hierarchy-caption">
                    {tPlural('cart.itemsInCart', itemCount)}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Progress indicator */}
          {items.length > 0 && (
            <div className="flex items-center space-x-2 typography-caption text-hierarchy-caption">
              <Package size={14} className="text-primary" />
              <span className="text-hierarchy-body">{t('cart.cart')}</span>
              <span className="text-hierarchy-caption">→</span>
              <span className="text-hierarchy-caption">{t('cart.checkout')}</span>
              <span className="text-hierarchy-caption">→</span>
              <span className="text-hierarchy-caption">{t('cart.payment')}</span>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty Cart */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 md:py-16"
          >
            <Card className="max-w-md mx-auto bg-card shadow-sm">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-accent rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={32} className="text-muted-foreground" />
                  </div>
                </div>

                <h2 className="typography-card-title text-hierarchy-title mb-3">
                  {t('cart.yourCartIsEmpty')}
                </h2>
                <p className="typography-caption text-hierarchy-subtitle mb-6 leading-relaxed">
                  {t('cart.looksLikeYouHavenTAdded')}
                </p>

                <div className="space-y-3">
                  <Link href="/products">
                    <Button className="w-full">
                      <ShoppingBag size={18} className="mr-2" />
                      {t('cart.startShopping')}
                    </Button>
                  </Link>
                  <Link href="/deals">
                    <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-muted">
                      {t('cart.viewDeals')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Cart with Items */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              <CartDealsPanel className="rounded-md border border-border bg-muted/30 p-3" />

              <CartActions
                itemCount={itemCount}
                showViewCart={false}
                className="rounded-md border border-border bg-muted/30 px-3 py-2 sm:px-3"
              />

              {/* Only the list scrolls. The summary opposite it is what a
                  customer checks while changing quantities, so it stays put
                  however long the cart gets — the same contract the drawer's
                  pinned footer has. */}
              <div className="space-y-3 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
                <AnimatePresence>
                  {orderedItems.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${item.variant || 'default'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="bg-card shadow-sm border border-border">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex space-x-3">
                            {/* Product Image */}
                            <div className="relative flex-shrink-0">
                              <div className="w-16 h-16 md:w-20 md:h-20 bg-accent rounded-lg overflow-hidden">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {/* Quantity badge */}
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white text-xs font-semibold">{item.quantity}</span>
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              {/* Product Name and Price */}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className="font-semibold text-foreground leading-tight line-clamp-2 text-sm md:text-base">
                                    {item.name}
                                  </h3>
                                  {item.variant && (
                                    <Badge variant="outline" className="text-xs mt-1 border-border text-muted-foreground">
                                      {item.variant}
                                    </Badge>
                                  )}
                                  {/* One line for the whole offer. The
                                      components are listed as a note, not as
                                      separate paid rows. */}
                                  {item.itemType === 'combo_bundle' ? (
                                    <div className="mt-1.5">
                                      <Badge
                                        variant="outline"
                                        className="border-foreground/30 font-label text-[10px] uppercase tracking-[0.14em] text-foreground"
                                      >
                                        {t(
                                          item.comboType === 'bundle'
                                            ? 'combos.badge.bundle'
                                            : 'combos.badge.combo'
                                        )}
                                      </Badge>
                                      {item.components?.length ? (
                                        <ul className="mt-1.5 space-y-0.5">
                                          {item.components.map((component) => (
                                            <li
                                              key={`${component.productId}-${component.variantId ?? ''}`}
                                              className="font-caption text-xs text-muted-foreground"
                                            >
                                              {component.name} ×{component.qty}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="text-right">
                                  {item.isGift ? (
                                    <>
                                      {/* Priced, not just labelled: a zero beside
                                          the struck-through list price says what
                                          the gift is worth. */}
                                      <div className="typography-product-price">
                                        {formatEuroCurrency(0)}
                                      </div>
                                      {item.listPrice ? (
                                        <div className="typography-micro text-hierarchy-caption line-through">
                                          {formatEuroCurrency(item.listPrice)}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <div className="typography-product-price">
                                        {formatEuroCurrency(item.price * item.quantity)}
                                      </div>
                                      <div className="typography-micro text-hierarchy-caption">
                                        {t('common.eachPrice', { price: formatEuroCurrency(item.price) })}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Quantity Controls & Actions */}
                              {item.isGift ? (
                                // The deal owns this line: fixed quantity, no
                                // remove. It disappears when the cart stops
                                // qualifying, and the Deals panel above shows
                                // that deal back in its locked state.
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                                    <Gift size={11} />
                                    {t('cart.deals.free')}
                                  </span>
                                  <span className="typography-micro text-hierarchy-label font-medium">
                                    ×{item.quantity}
                                  </span>
                                </div>
                              ) : (
                              <div className="flex items-center justify-between">
                                {/* Quantity Controls */}
                                <div className="flex items-center space-x-2">
                                  <span className="typography-micro text-hierarchy-label font-medium">{t('cart.qty')}</span>
                                  <div className="flex items-center border border-border rounded-md">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 rounded-none hover:bg-accent"
                                      onClick={() => handleQuantityChange(item.id, item.variant, item.quantity - 1)}
                                    >
                                      <Minus size={12} className="text-muted-foreground" />
                                    </Button>
                                    <div className="w-8 h-6 flex items-center justify-center border-x border-border typography-micro font-semibold text-hierarchy-title bg-card">
                                      {item.quantity}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 rounded-none hover:bg-accent"
                                      onClick={() => handleQuantityChange(item.id, item.variant, item.quantity + 1)}
                                    >
                                      <Plus size={12} className="text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveToWishlist(item)}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                                  >
                                    <Heart size={12} className="mr-1" />
                                    <span className="hidden sm:inline">{t('cart.save')}</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => dispatch(removeFromCart({ id: item.id, variant: item.variant }))}
                                    className="h-7 px-2 text-xs text-destructive-600 hover:text-destructive-700 hover:bg-destructive-50"
                                  >
                                    <Trash2 size={12} className="mr-1" />
                                    <span className="hidden sm:inline">{t('cart.remove')}</span>
                                  </Button>
                                </div>
                              </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Card className="bg-card shadow-sm border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-foreground">
                      <ShoppingBag size={18} className="text-primary" />
                      <span>{t('cart.orderSummary')}</span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Items Summary */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('cart.subtotalWithCount', { count: itemCount })}</span>
                        <span className="font-price font-semibold text-foreground">{formatEuroCurrency(subtotal)}</span>
                      </div>

                      {dealDiscount > 0 && (
                        <div className="flex justify-between text-sm text-primary-700">
                          <span>{t('cart.deals.discountLabel')}</span>
                          <span className="font-price font-semibold">-{formatEuroCurrency(dealDiscount)}</span>
                        </div>
                      )}

                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-primary-700">
                          <span>{t('cart.discount')}</span>
                          <span className="font-price font-semibold">-{formatEuroCurrency(discount)}</span>
                        </div>
                      )}

                      {totalSavings > 0 && (
                        <p className="inline-flex items-center rounded-sm bg-primary/10 px-2 py-0.5 font-caption text-xs font-semibold text-primary-800">
                          {t('cart.deals.youSaved', { amount: formatEuroCurrency(totalSavings) })}
                        </p>
                      )}

                      <div className="text-xs font-caption text-subtle-foreground">
                        {t('cart.shippingAndTaxesCalculatedAtCheckout')}
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Total */}
                    <div className="flex justify-between font-bold text-lg text-foreground">
                      <span>{t('cart.total')}</span>
                      <span className="font-price">{formatEuroCurrency(finalTotal)}</span>
                    </div>

                    {/* Coupon Section */}
                    <div className="space-y-3">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-3 bg-success-50 border border-success-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Tag size={14} className="text-success-600" />
                            <span className="text-sm font-medium text-success-800">{appliedCoupon}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch(removeCoupon())}
                            className="text-success-600 hover:text-success-700 hover:bg-success-100"
                          >
                            {t('cart.remove')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              placeholder={t('cart.enterCouponCode')}
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              className="flex-1 border-border focus:border-primary focus:ring-primary"
                            />
                            <Button
                              variant="outline"
                              onClick={handleCouponApply}
                              disabled={couponLoading || !couponCode.trim()}
                              size="sm"
                              className="border-border text-muted-foreground hover:bg-muted"
                            >
                              {couponLoading ? (
                                <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin" />
                              ) : (
                                'Apply'
                              )}
                            </Button>
                          </div>
                          {error && (
                            <p className="text-xs text-destructive-600 bg-destructive-50 p-2 rounded">{error}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Checkout Buttons */}
                    <div className="space-y-3 pt-2">
                      <Link href="/checkout">
                        <Button className="w-full">
                          {t('cart.proceedToCheckout')}
                        </Button>
                      </Link>
                      <Link href="/products">
                        <Button variant="outline" className="w-full">
                          {t('cart.continueShopping')}
                        </Button>
                      </Link>
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center justify-center space-x-2 p-3 bg-muted rounded-lg">
                      <Shield size={16} className="text-success-600" />
                      <span className="text-sm text-muted-foreground">{t('cart.secureCheckout')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
