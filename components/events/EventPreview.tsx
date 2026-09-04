'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import EventProductCard from '@/components/events/EventProductCard';
import type { ProductCardProduct } from '@/components/ui/product-card-model';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface EventProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage?: string;
  averageRating?: number;
  totalReviews?: number;
  quantity?: number;
  images?: string[];
  variants?: ProductCardProduct['variants'];
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isLimitedEdition?: boolean;
}

export interface EventPreviewProps {
  event: {
    _id: string;
    title: string;
    subtitle?: string;
    bannerImage?: string;
    discountText: string;
    layoutType?: 'horizontal' | 'vertical';
    cta?: {
      label: string;
      url: string;
      openInNewTab: boolean;
    };
    startDate: string;
    endDate: string;
    products: EventProduct[];
    isActive: boolean;
    status: 'active' | 'upcoming' | 'expired' | 'inactive';
  };
  showProducts?: boolean;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ZERO_TIME: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

const PLACEHOLDER_IMAGE = '/placeholder-product.jpg';

/**
 * Banner surface.
 *
 * Square, full-bleed and dark: the artwork carries the campaign and the type
 * sits on a vertical gradient over it, rather than the brand-gradient card with
 * a blurred pill stack this used to be. With no artwork the panel falls back to
 * the foreground token, so an event without a banner still reads as a
 * deliberate black plate instead of a coloured placeholder.
 */
const BANNER_SURFACE =
  'relative isolate overflow-hidden bg-foreground text-background';

const STATUS_KEY: Record<string, string> = {
  active: 'events.eventPreview.statusActive',
  upcoming: 'events.eventPreview.statusUpcoming',
  expired: 'events.eventPreview.statusExpired',
  inactive: 'events.eventPreview.statusInactive',
};

function useCountdown(target: string, enabled: boolean): TimeLeft | null {
  // Null until mounted: the server has no clock the client would agree with,
  // and rendering a countdown on the server guarantees a hydration mismatch.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const distance = new Date(target).getTime() - Date.now();
      if (!Number.isFinite(distance) || distance <= 0) {
        setTimeLeft(ZERO_TIME);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / 86_400_000),
        hours: Math.floor((distance % 86_400_000) / 3_600_000),
        minutes: Math.floor((distance % 3_600_000) / 60_000),
        seconds: Math.floor((distance % 60_000) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target, enabled]);

  return timeLeft;
}

function Countdown({
  timeLeft,
  label,
  size = 'md',
}: {
  timeLeft: TimeLeft;
  label: string;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();

  const units = [
    { value: timeLeft.days, label: t('events.eventPreview.days') },
    { value: timeLeft.hours, label: t('events.eventPreview.hours') },
    { value: timeLeft.minutes, label: t('events.eventPreview.min') },
    { value: timeLeft.seconds, label: t('events.eventPreview.sec') },
  ];

  return (
    <div className="border-t border-background/25 pt-4">
      <p className="font-label text-[0.625rem] uppercase tracking-[0.22em] text-background/60">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-5">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col">
            <span
              className={cn(
                'font-price tabular-nums leading-none text-background',
                size === 'md' ? 'text-3xl lg:text-4xl' : 'text-2xl',
              )}
            >
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="mt-1.5 font-label text-[0.5625rem] uppercase tracking-[0.18em] text-background/55">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCta({
  cta,
  className,
}: {
  cta: { label: string; url: string; openInNewTab: boolean };
  className?: string;
}) {
  const shared = cn(
    'inline-flex h-12 items-center gap-2.5 bg-background px-7 font-button text-[0.6875rem] uppercase tracking-[0.18em] text-foreground',
    'transition-colors duration-300 ease-out hover:bg-background/85',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background',
    className,
  );

  const inner = (
    <>
      {cta.label}
      <ArrowRight size={14} className="shrink-0" />
    </>
  );

  if (cta.openInNewTab) {
    return (
      <a
        href={cta.url}
        target="_blank"
        rel="noopener noreferrer"
        className={shared}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={cta.url} className={shared}>
      {inner}
    </Link>
  );
}

/**
 * Copy stack shared by both banner layouts: status, title, subtitle, discount,
 * count, countdown, CTA — in that order, which is the hierarchy the campaign
 * needs rather than the order the fields happen to sit in the record.
 */
function BannerContent({
  event,
  productCount,
  timeLeft,
  countdownLabel,
  compact,
}: {
  event: EventPreviewProps['event'];
  productCount: number;
  timeLeft: TimeLeft | null;
  countdownLabel: string | null;
  compact?: boolean;
}) {
  const { t, tPlural } = useTranslation();
  const statusKey = STATUS_KEY[event.status] || STATUS_KEY.inactive;

  return (
    <div className={cn('flex flex-col', compact ? 'gap-4' : 'gap-5')}>
      <div>
        <p className="font-label text-[0.625rem] uppercase tracking-[0.22em] text-background/70">
          {t(statusKey)}
        </p>
        <h3
          className={cn(
            'mt-3 font-navigation font-semibold leading-[1.05] tracking-[-0.01em] text-background',
            compact
              ? 'text-2xl sm:text-3xl'
              : 'text-3xl sm:text-4xl lg:text-[3.25rem]',
          )}
        >
          {event.title}
        </h3>
        {event.subtitle ? (
          <p
            className={cn(
              'mt-3 max-w-xl font-paragraph text-background/75',
              compact ? 'text-sm' : 'text-sm sm:text-base',
            )}
          >
            {event.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {event.discountText ? (
          <p
            className={cn(
              'font-label uppercase tracking-[0.12em] text-background',
              compact ? 'text-sm' : 'text-base sm:text-lg',
            )}
          >
            {event.discountText}
          </p>
        ) : null}
        <p className="font-caption text-xs text-background/60">
          {tPlural('events.eventPreview.productsInEvent', productCount)}
        </p>
      </div>

      {timeLeft && countdownLabel ? (
        <Countdown
          timeLeft={timeLeft}
          label={countdownLabel}
          size={compact ? 'sm' : 'md'}
        />
      ) : null}

      {event.cta?.label && event.cta?.url ? (
        <EventCta
          cta={event.cta}
          className={compact ? 'mt-1 h-11 px-6' : 'mt-1 self-start'}
        />
      ) : null}
    </div>
  );
}

function BannerArtwork({
  event,
  priority,
}: {
  event: EventPreviewProps['event'];
  priority?: boolean;
}) {
  if (!event.bannerImage) return null;

  return (
    <>
      <Image
        src={event.bannerImage}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 1600px"
        priority={priority}
        className="object-cover object-center"
      />
      {/*
        A graded wash, not a flat 40% black: the copy edge stays legible while
        the artwork keeps its contrast on the open side.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/60 to-foreground/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent"
      />
    </>
  );
}

function toCardProduct(product: EventProduct): ProductCardProduct {
  return {
    ...product,
    thumbnailImage: product.thumbnailImage || PLACEHOLDER_IMAGE,
  };
}

export default function EventPreview({
  event,
  showProducts = true,
  className = '',
}: EventPreviewProps) {
  const { t, tPlural } = useTranslation();

  const isCountdownActive =
    event.status === 'active' || event.status === 'upcoming';
  const countdownTarget =
    event.status === 'upcoming' ? event.startDate : event.endDate;
  const timeLeft = useCountdown(countdownTarget, isCountdownActive);

  const countdownLabel = isCountdownActive
    ? event.status === 'upcoming'
      ? t('events.eventPreview.startsIn')
      : t('events.eventPreview.endsIn')
    : null;

  const products = useMemo(
    () => (event.products || []).map(toCardProduct),
    [event.products],
  );

  const layoutType = event.layoutType || 'horizontal';

  /* ── Vertical: the banner is one tall cell inside the product grid ── */
  if (layoutType === 'vertical') {
    return (
      <div className={cn('w-full', className)}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4 lg:gap-x-7">
          <div
            className={cn(
              BANNER_SURFACE,
              'col-span-2 row-span-2 flex min-h-[26rem] flex-col justify-end p-6 sm:p-8',
            )}
          >
            <BannerArtwork event={event} priority />
            <div className="relative z-10">
              <BannerContent
                event={event}
                productCount={products.length}
                timeLeft={timeLeft}
                countdownLabel={countdownLabel}
                compact
              />
            </div>
          </div>

          {showProducts
            ? products.slice(0, 6).map((product) => (
                <EventProductCard
                  key={product._id}
                  product={product}
                  fallbackDiscountLabel={event.discountText}
                />
              ))
            : null}
        </div>

        {showProducts && products.length > 6 ? (
          <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4 lg:gap-x-7">
            {products.slice(6).map((product) => (
              <EventProductCard
                key={product._id}
                product={product}
                fallbackDiscountLabel={event.discountText}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  /* ── Horizontal: full-width banner, products beneath ── */
  return (
    <div className={cn('w-full', className)}>
      <div className={cn(BANNER_SURFACE, 'flex min-h-[20rem] items-end')}>
        <BannerArtwork event={event} priority />

        <div className="relative z-10 w-full p-6 sm:p-9 lg:p-12">
          <div className="max-w-2xl">
            <BannerContent
              event={event}
              productCount={products.length}
              timeLeft={timeLeft}
              countdownLabel={countdownLabel}
            />
          </div>
        </div>
      </div>

      {showProducts && products.length > 0 ? (
        <div className="mt-8 lg:mt-10">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
            <h4 className="font-navigation text-base font-semibold text-foreground">
              {t('events.eventPreview.eventProducts')}
            </h4>
            <p className="font-caption text-xs text-muted-foreground">
              {tPlural('events.eventPreview.productCountShort', products.length)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
            {products.map((product) => (
              <EventProductCard
                key={product._id}
                product={product}
                fallbackDiscountLabel={event.discountText}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
