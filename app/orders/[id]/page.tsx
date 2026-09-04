"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from "@/components/ui/button";
import { QuantityBadge } from "@/components/ui/quantity-badge";
import { cn, formatEuroCurrency } from "@/lib/utils";
import {
    Calendar,
    CreditCard,
    Mail,
    MapPin,
    Package,
    ShoppingBag,
    Star,
    Truck,
    X
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Order {
  _id: string;
  orderNumber: string;
  items: Array<{
    product: {
      _id: string;
      name: string;
      thumbnailImage: string;
    };
    name: string;
    price: number;
    quantity: number;
    variant?: string;
    image?: string;
  }>;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discountAmount: number;
  dealDiscount?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  shippingAddress: {
    name: string;
    phone: string;
    email?: string;
    street: string;
    city: string;
    district: string;
    division: string;
  };
  deliveryType: string;
  expectedDelivery?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
}

/** A titled panel — the single visual container used across the page. */
function Panel({
  title,
  icon: Icon,
  children,
  aside,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon size={15} />
          </span>
          <h2 className="typography-card-title text-hierarchy-title">{title}</h2>
        </div>
        {aside}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/**
 * The order-placed mark: a ring and a check that draw themselves once, in the
 * theme's own ink — no colour shift, no bounce. Driven by CSS rather than a
 * JS animation loop so it always settles on its final frame; a throttled
 * requestAnimationFrame would otherwise leave the mark half-drawn. `pathLength`
 * normalises both shapes to a length of 1 so one keyframe draws either.
 */
function OrderPlacedMark() {
  return (
    <span className="order-mark relative flex h-9 w-9 shrink-0 items-center justify-center">
      <span aria-hidden className="order-mark-pulse absolute inset-0 rounded-full border border-border" />
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card">
        <svg viewBox="0 0 36 36" className="h-[18px] w-[18px]" aria-hidden>
          <circle
            className="order-mark-ring text-border"
            cx="18"
            cy="18"
            r="16"
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            className="order-mark-check text-foreground"
            d="M11 18.5 L15.75 23 L25 13"
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <style jsx>{`
        .order-mark-ring,
        .order-mark-check {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: order-mark-draw 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .order-mark-ring {
          transform: rotate(-90deg);
          transform-origin: center;
        }
        .order-mark-check {
          animation-duration: 0.3s;
          animation-delay: 0.28s;
        }
        .order-mark-pulse {
          opacity: 0;
          animation: order-mark-pulse 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
        }
        @keyframes order-mark-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes order-mark-pulse {
          from {
            transform: scale(0.85);
            opacity: 0.9;
          }
          to {
            transform: scale(1.45);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .order-mark-ring,
          .order-mark-check {
            animation: none;
            stroke-dashoffset: 0;
          }
          .order-mark-pulse {
            animation: none;
          }
        }
      `}</style>
    </span>
  );
}

/** Neutral status chip — the state is carried by a small dot, not a coloured slab. */
function StatusChip({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1">
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone)} />
      <span className="typography-micro text-hierarchy-title">{label}</span>
    </span>
  );
}

/** A read-only label/value pair. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="typography-micro shrink-0 uppercase tracking-wide text-muted-foreground sm:w-28">
        {label}
      </dt>
      <dd className="typography-caption text-hierarchy-body">{value}</dd>
    </div>
  );
}

export default function OrderDetailsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setOrder(data.order);
      } else {
        console.error("Order not found");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return formatEuroCurrency(price);
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "delivered":
      case "confirmed":
      case "paid":
        return "bg-success";
      case "shipped":
        return "bg-info";
      case "processing":
      case "pending":
        return "bg-warning";
      case "cancelled":
      case "failed":
        return "bg-destructive";
      default:
        return "bg-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pb-24 pt-6 md:pb-12 md:pt-8">
          <div className="flex h-64 items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pb-24 pt-6 md:pb-12 md:pt-8">
          <div className="mx-auto max-w-md py-20 text-center">
            <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Package size={24} />
            </span>
            <h1 className="mb-3 typography-section-title text-hierarchy-title">
              {t('orders.detail.orderNotFound')}
            </h1>
            <p className="mb-8 typography-caption text-hierarchy-subtitle">
              {t('orders.detail.theOrderYouReLookingFor')}
            </p>
            <Button asChild size="lg">
              <Link href="/products">{t('orders.detail.continueShopping')}</Link>
            </Button>
          </div>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  // Progress steps for order lifecycle
  const orderSteps = [
    { key: "pending", label: t('orders.detail.pending') },
    { key: "confirmed", label: t('orders.detail.confirmed') },
    { key: "processing", label: t('orders.detail.processing') },
    { key: "shipped", label: t('orders.detail.shipped') },
    { key: "delivered", label: t('orders.detail.delivered') }
  ];
  const currentStepIndex = Math.max(
    0,
    orderSteps.findIndex((s) => s.key === order.orderStatus)
  );

  const orderMeta = [
    {
      key: "date",
      icon: Calendar,
      label: t('orders.detail.orderDate'),
      value: new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    {
      key: "payment",
      icon: CreditCard,
      label: t('orders.detail.paymentMethod'),
      value: order.paymentMethod === "cod"
        ? t('orders.detail.cashOnDelivery')
        : order.paymentMethod,
    },
    {
      key: "delivery",
      icon: Truck,
      label: t('orders.detail.deliveryType'),
      value: order.deliveryType.replace("-", " "),
    },
  ];

  const expectedDelivery = order.expectedDelivery
    ? new Date(order.expectedDelivery).toLocaleDateString()
    : order.deliveryType === "same-day"
      ? "Today"
      : order.deliveryType === "express"
        ? "1-2 days"
        : "3-5 days";

  return (
    <div className="min-h-screen bg-background">
      {/* On desktop the header plus the order view make up exactly one viewport,
          so the two panes below own their own scrolling instead of the page. */}
      <div className="lg:flex lg:h-screen lg:flex-col">
        <Header />

        <main className="container mx-auto px-4 pb-24 pt-6 md:pb-12 md:pt-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:pb-6">
        {/* Confirmation notice — neutral, not a celebratory green slab */}
        {isSuccess && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-4 duration-500 animate-in fade-in slide-in-from-top-2 sm:items-center sm:px-6">
            <OrderPlacedMark />
            <div className="min-w-0">
              <p className="typography-label text-hierarchy-title delay-200 duration-300 animate-in fade-in slide-in-from-bottom-1 fill-mode-both">
                {t('orders.detail.orderPlacedSuccessfully')}
              </p>
              <p className="typography-caption text-hierarchy-subtitle delay-300 duration-300 animate-in fade-in slide-in-from-bottom-1 fill-mode-both">
                {t('orders.detail.yourOrderHasBeenReceivedAnd')}
              </p>
            </div>
          </div>
        )}

        {/* Page heading */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-8">
          <div className="min-w-0">
            <h1 className="typography-section-title text-hierarchy-title">
              {t('orders.detail.orderDetails')}
            </h1>
            <p className="mt-1 typography-caption text-hierarchy-subtitle">
              {t('orders.detail.order')}{order.orderNumber}
            </p>
          </div>
          <Button asChild variant="outline" size="lg" className="gap-2 sm:shrink-0">
            <Link href="/products">
              <ShoppingBag size={16} />
              {t('orders.detail.continueShopping')}
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* ── Order content: scrolls within itself on desktop ── */}
          <div className="custom-scrollbar min-w-0 space-y-5 lg:max-h-full lg:overflow-y-auto lg:pr-3">
            {/* Status */}
            <Panel
              title={t('orders.detail.orderStatus')}
              icon={Package}
              aside={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <StatusChip
                    label={order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                    tone={getStatusTone(order.orderStatus)}
                  />
                  <StatusChip
                    label={order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    tone={getStatusTone(order.paymentStatus)}
                  />
                </div>
              }
            >
              {/* Segmented progress — legible at every breakpoint */}
              <ol
                className="grid grid-cols-5 gap-1.5"
                aria-label={t('orders.detail.orderProgress')}
              >
                {orderSteps.map((step, idx) => {
                  const completed = idx <= currentStepIndex;
                  return (
                    <li
                      key={step.key}
                      className="flex flex-col gap-2"
                      aria-current={idx === currentStepIndex ? "step" : undefined}
                    >
                      <span className={cn('h-1 rounded-full', completed ? 'bg-primary' : 'bg-border')} />
                      <span
                        className={cn(
                          'typography-micro leading-tight',
                          completed ? 'text-hierarchy-title' : 'text-hierarchy-subtitle'
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 grid grid-cols-1 divide-y divide-border rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {orderMeta.map((meta) => (
                  <div key={meta.key} className="flex items-center gap-3 px-4 py-3.5">
                    <meta.icon size={16} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="typography-micro uppercase tracking-wide text-muted-foreground">
                        {meta.label}
                      </p>
                      <p className="truncate capitalize typography-label text-hierarchy-title">
                        {meta.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {order.trackingNumber && (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="typography-micro uppercase tracking-wide text-muted-foreground">
                      {t('orders.detail.trackingNumber')}
                    </p>
                    <p className="truncate font-mono text-sm font-medium text-foreground">
                      {order.trackingNumber}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:shrink-0"
                    aria-label={t('orders.detail.trackPackage')}
                  >
                    {t('orders.detail.trackPackage2')}
                  </Button>
                </div>
              )}
            </Panel>

            {/* Items */}
            <Panel title={t('orders.detail.orderItems')} icon={ShoppingBag}>
              <ul className="-my-3 divide-y divide-border">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 py-3 sm:gap-4">
                    <div className="relative shrink-0">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-border bg-muted">
                        <img
                          src={item.image || item.product?.thumbnailImage}
                          alt={item.name || item.product?.name || t('orders.detail.productName')}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <QuantityBadge quantity={item.quantity} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate typography-label text-hierarchy-title">
                        {item.name || item.product?.name || t('orders.detail.productName')}
                      </p>
                      <p className="truncate typography-micro text-muted-foreground">
                        {item.variant ? `${item.variant} · ` : ''}
                        {item.price > 0
                          ? t('common.qtyTimesPrice', {
                              qty: item.quantity,
                              price: formatPrice(item.price)
                            })
                          : t('common.qtyOnly', { qty: item.quantity })}
                      </p>
                    </div>

                    <p className="font-price typography-label shrink-0 text-hierarchy-title">
                      {item.price > 0
                        ? formatPrice(item.price * item.quantity)
                        : t('cart.deals.free')}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* Shipping address */}
            <Panel title={t('orders.detail.shippingAddress')} icon={MapPin}>
              <dl className="space-y-3">
                <DetailRow
                  label={t('checkout.name')}
                  value={order.shippingAddress.name || t('orders.detail.nameNotAvailable')}
                />
                <DetailRow
                  label={t('checkout.phone2')}
                  value={order.shippingAddress.phone || t('orders.detail.phoneNotAvailable')}
                />
                {order.shippingAddress.email ? (
                  <DetailRow label={t('checkout.email')} value={order.shippingAddress.email} />
                ) : null}
                <DetailRow
                  label={t('checkout.address2')}
                  value={[
                    order.shippingAddress.street || t('orders.detail.streetAddressNotAvailable'),
                    order.shippingAddress.city,
                    order.shippingAddress.district,
                    order.shippingAddress.division
                  ].filter(Boolean).join(', ')}
                />
              </dl>
            </Panel>

            {/* Notes */}
            {order.notes && (
              <Panel title={t('orders.detail.orderNotes')} icon={Mail}>
                <p className="typography-caption text-hierarchy-body">{order.notes}</p>
              </Panel>
            )}
          </div>

          {/* ── Order summary: sticky on desktop ── */}
          <aside className="custom-scrollbar lg:max-h-full lg:overflow-y-auto">
            <div className="rounded-2xl border border-border bg-card">
              <header className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="typography-card-title text-hierarchy-title">
                  {t('orders.detail.orderSummary')}
                </h2>
              </header>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <dl className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="typography-caption text-muted-foreground">{t('orders.detail.subtotal')}</dt>
                    <dd className="font-price typography-label text-hierarchy-title">{formatPrice(order.subtotal || 0)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="typography-caption text-muted-foreground">{t('orders.detail.shipping')}</dt>
                    <dd className="font-price typography-label text-hierarchy-title">{formatPrice(order.shippingCost || 0)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="typography-caption text-muted-foreground">{t('orders.detail.tax')}</dt>
                    <dd className="font-price typography-label text-hierarchy-title">{formatPrice(order.tax || 0)}</dd>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="typography-caption text-muted-foreground">{t('orders.detail.discount')}</dt>
                      <dd className="font-price typography-label text-hierarchy-title">-{formatPrice(order.discountAmount)}</dd>
                    </div>
                  )}
                  {(order.dealDiscount ?? 0) > 0 && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="typography-caption text-muted-foreground">{t('orders.detail.dealDiscount')}</dt>
                      <dd className="font-price typography-label text-hierarchy-title">-{formatPrice(order.dealDiscount ?? 0)}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                  <span className="typography-label text-hierarchy-title">{t('orders.detail.total')}</span>
                  <span className="font-price typography-card-title text-hierarchy-title">{formatPrice(order.total || 0)}</span>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <Calendar size={16} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="typography-micro uppercase tracking-wide text-muted-foreground">
                      {t('orders.detail.expectedDelivery')}
                    </p>
                    <p className="typography-label text-hierarchy-title">{expectedDelivery}</p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  {order.orderStatus === "delivered" && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full gap-2"
                      aria-label={t('orders.detail.leaveAReview')}
                    >
                      <Star size={15} />
                      {t('orders.detail.leaveReview')}
                    </Button>
                  )}
                  {["pending", "confirmed"].includes(order.orderStatus) && (
                    <Button
                      variant="outline-destructive"
                      size="lg"
                      className="w-full gap-2"
                      aria-label={t('orders.detail.cancelOrder')}
                    >
                      <X size={15} />
                      {t('orders.detail.cancelOrder2')}
                    </Button>
                  )}
                  <Button
                    variant="ghost-secondary"
                    size="lg"
                    asChild
                    aria-label={t('orders.detail.contactSupport')}
                    className="w-full"
                  >
                    <Link href="/contact">{t('orders.detail.contactSupport2')}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
        </main>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
