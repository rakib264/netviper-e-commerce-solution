'use client';

import BackButton from '@/components/ui/back-button';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useHydration } from '@/hooks/use-hydration';
import { addToCart } from '@/lib/store/slices/cartSlice';
import { clearWishlist, loadWishlistFromStorage, removeFromWishlist } from '@/lib/store/slices/wishlistSlice';
import { RootState } from '@/lib/store/store';
import { formatEuroCurrency } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ShoppingBag, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export default function WishlistPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { items } = useSelector((state: RootState) => state.wishlist);
  const isHydrated = useHydration();

  useEffect(() => {
    // Load wishlist from localStorage on mount
    dispatch(loadWishlistFromStorage());
  }, [dispatch]);

  const handleAddToCart = (item: any) => {
    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
      maxQuantity: 10
    }));
  };

  const handleRemoveFromWishlist = (id: string) => {
    dispatch(removeFromWishlist(id));
  };

  const totalValue = items.reduce((sum, item) => sum + item.price, 0);
  const inStockItems = items.filter(item => item.inStock);
  const outOfStockItems = items.filter(item => !item.inStock);

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
            <BackButton label={t('wishlist.back')} />
          </div>

          {/* Title Section */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg">
                <Heart size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {t('wishlist.myWishlist')}
                </h1>
                {items.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    {items.length} {items.length === 1 ? 'item' : 'items'} {t('wishlist.savedForLater')}
                  </p>
                )}
              </div>
            </div>

            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(clearWishlist())}
                className="text-destructive-600 hover:text-destructive-700 hover:bg-destructive-50 hidden md:flex"
              >
                <Trash2 size={16} className="mr-2" />
                {t('wishlist.clearAll')}
              </Button>
            )}
          </div>

          {/* Progress indicator */}
          {items.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-subtle-foreground">
              <Heart size={14} className="text-primary" />
              <span className="text-muted-foreground">{t('wishlist.wishlist')}</span>
              <span className="text-subtle-foreground">→</span>
              <span className="text-subtle-foreground">{t('wishlist.addToCart')}</span>
              <span className="text-subtle-foreground">→</span>
              <span className="text-subtle-foreground">{t('wishlist.checkout')}</span>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty Wishlist */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 md:py-16"
          >
            <Card className="max-w-md mx-auto bg-card shadow-sm">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-accent rounded-full flex items-center justify-center mb-4">
                    <Heart size={32} className="text-muted-foreground" />
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {t('wishlist.yourWishlistIsEmpty')}
                </h2>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                  {t('wishlist.saveItemsYouLoveToYour')}
                </p>

                <div className="space-y-3">
                  <Link href="/products">
                    <Button className="w-full">
                      <ShoppingBag size={18} className="mr-2" />
                      {t('wishlist.startShopping')}
                    </Button>
                  </Link>
                  <Link href="/deals">
                    <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-muted">
                      {t('wishlist.viewDeals')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Wishlist with Items */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Wishlist Items */}
            <div className="lg:col-span-2 space-y-3">
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
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
                            {/* Wishlist badge */}
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive-500 rounded-full flex items-center justify-center shadow-sm">
                              <Heart size={10} className="text-white fill-white" />
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
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant={item.inStock ? "default" : "secondary"} className="text-xs">
                                    {item.inStock ? t('wishlist.inStock') : t('wishlist.outOfStock')}
                                  </Badge>
                                  {item.comparePrice && (
                                    <Badge className="text-xs bg-destructive-500">
                                      {t('common.percentOff', { percent: Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100) })}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-price font-bold text-foreground text-sm md:text-base">
                                  {formatEuroCurrency(item.price)}
                                </div>
                                {item.comparePrice && (
                                  <div className="text-xs font-caption text-subtle-foreground line-through">
                                    {formatEuroCurrency(item.comparePrice)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-caption text-muted-foreground">
                                {t('wishlist.savedForLater2')}
                              </div>

                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddToCart(item)}
                                  disabled={!item.inStock}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                                >
                                  <ShoppingBag size={12} className="mr-1" />
                                  <span className="hidden sm:inline">{t('wishlist.addToCart')}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFromWishlist(item.id)}
                                  className="h-7 px-2 text-xs text-destructive-600 hover:text-destructive-700 hover:bg-destructive-50"
                                >
                                  <Trash2 size={12} className="mr-1" />
                                  <span className="hidden sm:inline">{t('wishlist.remove')}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Mobile Clear All Button */}
              <div className="block md:hidden">
                <Button
                  variant="outline"
                  onClick={() => dispatch(clearWishlist())}
                  className="w-full text-destructive-600 border-destructive-300 hover:bg-destructive-50 hover:border-destructive-400"
                >
                  <Trash2 size={16} className="mr-2" />
                  {t('wishlist.clearAllItems')}
                </Button>
              </div>
            </div>

            {/* Wishlist Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Card className="bg-card shadow-sm border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-foreground">
                      <Heart size={18} className="text-primary" />
                      <span>{t('wishlist.wishlistSummary')}</span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Items Summary */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('wishlist.totalItems')}</span>
                        <span className="font-semibold text-foreground">{items.length}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('wishlist.inStock')}</span>
                        <span className="font-semibold text-success-600">{inStockItems.length}</span>
                      </div>

                      {outOfStockItems.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('wishlist.outOfStock')}</span>
                          <span className="font-semibold text-destructive-600">{outOfStockItems.length}</span>
                        </div>
                      )}

                      <div className="text-xs font-caption text-subtle-foreground">
                        {t('wishlist.totalValueOfAllItems')}
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Total Value */}
                    <div className="flex justify-between font-bold text-lg text-foreground">
                      <span>{t('wishlist.totalValue')}</span>
                      <span className="font-price">{formatEuroCurrency(totalValue)}</span>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3 pt-2">
                      {inStockItems.length > 0 && (
                        <Button
                          className="w-full"
                          onClick={() => {
                            inStockItems.forEach(item => handleAddToCart(item));
                          }}
                        >
                          <ShoppingBag size={16} className="mr-2" />
                          {t('wishlist.addAllToCartWithCount', { count: inStockItems.length })}
                        </Button>
                      )}
                      <Link href="/products">
                        <Button variant="outline" className="w-full">
                          {t('wishlist.continueShopping')}
                        </Button>
                      </Link>
                    </div>

                    {/* Tips */}
                    <div className="flex items-start space-x-2 p-3 bg-info-50 rounded-lg">
                      <Zap size={16} className="text-info-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-info-800">
                        <p className="font-medium mb-1">{t('wishlist.proTip')}</p>
                        <p>{t('wishlist.addItemsToCartWhenThey')}</p>
                      </div>
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
