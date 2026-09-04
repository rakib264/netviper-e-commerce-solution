'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import ReturnsSection from '@/components/profile/ReturnsSection';
import RewardsSection from '@/components/profile/RewardsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { addToCart } from '@/lib/store/slices/cartSlice';
import { removeFromWishlist } from '@/lib/store/slices/wishlistSlice';
import { RootState } from '@/lib/store/store';
import { cn, formatEuroCurrency } from '@/lib/utils';
import { Bell, Camera, Heart, LogOut, RotateCcw, ShoppingBag, Sparkles, Trash2, Upload, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  profileImage?: string;
}

/** Field label + input spacing, shared by every form row on the page. */
const fieldLabelClass = 'mb-1.5 block typography-label text-hierarchy-label';

/**
 * The content container for one tab. Same shell the checkout and order pages
 * use, so a customer moving between them meets one card, one header rhythm.
 */
function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="typography-card-title text-hierarchy-title">{title}</h2>
          {description ? (
            <p className="typography-micro text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/** Centred icon + copy + action, used by both empty states. */
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={22} />
      </span>
      <h3 className="mb-2 typography-card-title text-hierarchy-title">{title}</h3>
      <p className="mb-6 typography-caption text-hierarchy-subtitle">{description}</p>
      <Button asChild size="lg">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useDispatch();
  const wishlist = useSelector((state: RootState) => state.wishlist.items);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: session?.user?.name?.split(' ')[0] || '',
    lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
    phone: '',
    profileImage: ''
  });

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  // Load profile data and orders
  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders();
      (async () => {
        try {
          const res = await fetch('/api/profile');
          const data = await res.json();
          if (res.ok) {
            setForm({
              firstName: data.user.firstName || '',
              lastName: data.user.lastName || '',
              phone: data.user.phone || '',
              profileImage: data.user.profileImage || ''
            });
          }
        } catch (e) {}
      })();
    }
  }, [status]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="typography-caption text-hierarchy-subtitle">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('profile.fileTooLarge'), description: t('profile.pleaseSelectAnImageSmallerThan'), variant: 'error' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, profileImage: data.url }));
        toast({ title: t('profile.imageUploaded'), description: t('profile.profileImageUpdatedSuccessfully'), variant: 'success' });

        // Automatically save the profile with the new image
        try {
          await saveProfile();
        } catch (error) {
          console.error('Failed to save profile after image upload:', error);
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (e) {
      toast({ title: t('profile.uploadFailed'), description: t('profile.pleaseTryAgain'), variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Failed');
      toast({ title: t('profile.profileUpdated'), description: t('profile.yourPersonalInformationWasSaved'), variant: 'success' });
    } catch (e) {
      console.error('Profile save error:', e);
      toast({ title: t('profile.updateFailed'), description: t('profile.pleaseTryAgain'), variant: 'error' });
    }
  };

  const handleRemoveFromWishlist = (itemId: string) => {
    dispatch(removeFromWishlist(itemId));
    toast({ title: t('profile.removedFromWishlist'), description: t('profile.itemHasBeenRemovedFromYour'), variant: 'success' });
  };

  const handleAddToCart = (item: any) => {
    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
      maxQuantity: item.inStock ? 10 : 0
    }));
    toast({ title: t('profile.addedToCart'), description: t('profile.itemAddedToCart', { name: item.name }), variant: 'success' });
  };

  const cancelOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === id ? { ...o, orderStatus: 'cancelled' } : o));
      }
    } catch (e) {}
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/auth/signin' });
      toast({ title: t('profile.signedOut'), description: t('profile.youHaveBeenSuccessfullySignedOut'), variant: 'success' });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ title: t('profile.signOutFailed'), description: t('profile.pleaseTryAgain'), variant: 'error' });
    }
  };

  /** Order status keeps its meaning in a dot, not a coloured slab. */
  const statusTone = (statusValue: string) => {
    switch (statusValue) {
      case 'delivered':
      case 'confirmed':
        return 'bg-success';
      case 'shipped':
        return 'bg-info';
      case 'processing':
      case 'pending':
        return 'bg-warning';
      case 'cancelled':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  const navItems = [
    { value: 'info', label: t('profile.personalInfo'), icon: User },
    { value: 'orders', label: t('profile.orders'), icon: ShoppingBag },
    { value: 'returns', label: t('profile.returns'), icon: RotateCcw },
    { value: 'rewards', label: t('profile.rewards.tabLabel'), icon: Sparkles },
    { value: 'wishlist', label: t('profile.wishlist'), icon: Heart },
    { value: 'notifications', label: t('notifications.title'), icon: Bell },
  ];

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ')
    || session?.user?.name
    || '';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pb-24 pt-6 md:pb-12 md:pt-8">
        <div className="mb-6 md:mb-8">
          <h1 className="typography-section-title text-hierarchy-title">{t('profile.myProfile')}</h1>
          <p className="mt-1 typography-caption text-hierarchy-subtitle">
            {t('profile.manageYourAccountSettingsAndPreferences')}
          </p>
        </div>

        <Tabs defaultValue="info" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[16rem_minmax(0,1fr)]">
          {/* ── Left column: identity + navigation, pinned on desktop ── */}
          <aside className="lg:sticky lg:top-[11rem]">
            <div className="rounded-2xl border border-border bg-card">
              {/* Identity */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-4">
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground">
                    {form.profileImage ? (
                      <img
                        src={form.profileImage}
                        alt={t('profile.profile')}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  {displayName ? (
                    <p className="truncate typography-label text-hierarchy-title">{displayName}</p>
                  ) : (
                    <p className="truncate typography-label text-hierarchy-title">{t('profile.account')}</p>
                  )}
                  <p className="truncate typography-micro text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>

              {/* Navigation — a column on desktop, a scrollable strip on mobile */}
              <TabsList
                aria-label={t('profile.account')}
                className="custom-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-2 lg:flex-col lg:overflow-visible"
              >
                {navItems.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      'shrink-0 justify-start gap-2.5 rounded-xl px-3 py-2.5 text-muted-foreground',
                      'transition-colors hover:bg-muted hover:text-foreground',
                      'data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none',
                      'lg:w-full'
                    )}
                  >
                    <item.icon size={16} className="shrink-0" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="border-t border-border p-2">
                <Button
                  onClick={handleSignOut}
                  variant="ghost-secondary"
                  className="w-full justify-start gap-2.5 rounded-xl px-3"
                >
                  <LogOut size={16} className="shrink-0" />
                  {t('profile.signOut')}
                </Button>
              </div>
            </div>
          </aside>

          {/* ── Right column: the selected tab ── */}
          <div className="min-w-0">
            <TabsContent value="info" className="mt-0 space-y-6">
              <Panel
                title={t('profile.personalInformation')}
                description={t('profile.updateYourPersonalDetailsAndProfile')}
                icon={User}
              >
                {/* Photo */}
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
                  <div className="group relative mx-auto shrink-0 sm:mx-0">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground">
                      {form.profileImage ? (
                        <img
                          src={form.profileImage}
                          alt={t('profile.profile')}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <User size={30} />
                      )}
                    </div>
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Camera size={20} className="text-background" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                        disabled={uploading}
                      />
                    </label>
                    {uploading && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      </span>
                    )}
                  </div>

                  <div className="text-center sm:text-left">
                    <label
                      className={cn(
                        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-4',
                        'typography-label text-hierarchy-title transition-colors hover:bg-muted',
                        uploading && 'pointer-events-none opacity-50'
                      )}
                    >
                      <Upload size={15} />
                      {uploading ? t('profile.uploading') : t('profile.changePhoto')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                        disabled={uploading}
                      />
                    </label>
                    <p className="mt-2 typography-micro text-muted-foreground">{t('profile.jpgPngUpTo5mb')}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className={fieldLabelClass}>{t('profile.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder={t('profile.enterYourFirstName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className={fieldLabelClass}>{t('profile.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder={t('profile.enterYourLastName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className={fieldLabelClass}>{t('profile.emailAddress')}</Label>
                    <Input id="email" value={session?.user?.email || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="phone" className={fieldLabelClass}>{t('profile.phoneNumber')}</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={t('profile.enterYourPhoneNumber')}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-border pt-5">
                  <Button onClick={saveProfile} size="lg" className="w-full sm:w-auto sm:min-w-[10rem]">
                    {t('profile.saveChanges')}
                  </Button>
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="orders" className="mt-0 space-y-6">
              <Panel
                title={t('profile.orderHistory')}
                description={t('profile.trackAndManageYourOrders')}
                icon={ShoppingBag}
              >
                {loading ? (
                  <div className="py-12 text-center">
                    <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                    <p className="typography-caption text-hierarchy-subtitle">{t('profile.loadingYourOrders')}</p>
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title={t('profile.noOrdersYet')}
                    description={t('profile.startShoppingToSeeYourOrders')}
                    actionLabel={t('profile.startShopping')}
                    actionHref="/products"
                  />
                ) : (
                  <ul className="-my-4 divide-y divide-border">
                    {orders.map((order) => (
                      <li
                        key={order._id}
                        className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="font-price typography-label text-hierarchy-title">
                              #{order.orderNumber}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusTone(order.orderStatus))} />
                              <span className="typography-micro text-hierarchy-title">
                                {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                              </span>
                            </span>
                          </div>
                          <p className="mt-1 typography-micro text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="mt-1 font-price typography-card-title text-hierarchy-title">
                            {formatEuroCurrency(order.total)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/orders/${order._id}`}>{t('profile.viewDetails')}</Link>
                          </Button>
                          {['pending', 'confirmed'].includes(order.orderStatus) && (
                            <Button
                              variant="outline-destructive"
                              size="sm"
                              onClick={() => cancelOrder(order._id)}
                            >
                              {t('profile.cancelOrder')}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="returns" className="mt-0 space-y-6">
              <Panel
                title={t('profile.returnsExchanges')}
                description={t('profile.manageYourReturnsAndExchanges')}
                icon={RotateCcw}
              >
                <ReturnsSection />
              </Panel>
            </TabsContent>

            <TabsContent value="rewards" className="mt-0 space-y-6">
              <RewardsSection />
            </TabsContent>

            <TabsContent value="wishlist" className="mt-0 space-y-6">
              <Panel
                title={t('profile.myWishlist')}
                description={t('profile.yourFavoriteItemsSavedForLater')}
                icon={Heart}
              >
                {wishlist.length === 0 ? (
                  <EmptyState
                    icon={Heart}
                    title={t('profile.yourWishlistIsEmpty')}
                    description={t('profile.startAddingItemsYouLoveTo')}
                    actionLabel={t('profile.browseProducts')}
                    actionHref="/products"
                  />
                ) : (
                  <ul className="-my-4 divide-y divide-border">
                    {wishlist.map((item) => (
                      <li key={item.id} className="flex items-start gap-3 py-4 sm:gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          <img
                            src={item.image || '/placeholder-product.jpg'}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 typography-label text-hierarchy-title">{item.name}</h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 shrink-0 rounded-full',
                                      item.inStock ? 'bg-success' : 'bg-destructive'
                                    )}
                                  />
                                  <span className="typography-micro text-hierarchy-title">
                                    {item.inStock ? t('profile.inStock') : t('profile.outOfStock')}
                                  </span>
                                </span>
                                {item.comparePrice && item.comparePrice > item.price ? (
                                  <span className="rounded-full border border-border px-2.5 py-1 typography-micro text-hierarchy-subtitle">
                                    {t('common.percentOff', {
                                      percent: Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)
                                    })}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="font-price typography-label text-hierarchy-title">
                                {formatEuroCurrency(item.price)}
                              </p>
                              {item.comparePrice && item.comparePrice > item.price ? (
                                <p className="font-price typography-micro text-muted-foreground line-through">
                                  {formatEuroCurrency(item.comparePrice)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="typography-micro text-muted-foreground">
                              {t('profile.savedForLater')}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddToCart(item)}
                                disabled={!item.inStock}
                                className="gap-1.5"
                              >
                                <ShoppingBag size={13} />
                                {t('profile.addToCart')}
                              </Button>
                              <Button
                                variant="ghost-secondary"
                                size="sm"
                                onClick={() => handleRemoveFromWishlist(item.id)}
                                className="gap-1.5"
                              >
                                <Trash2 size={13} />
                                {t('profile.remove')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 space-y-6">
              <Panel
                title={t('notifications.preferences.title')}
                description={t('notifications.preferences.description')}
                icon={Bell}
              >
                <NotificationPreferencesPanel />
              </Panel>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
