'use client';

import { dealHeadline, dealRequirement } from '@/components/deals/deal-presentation';
import { StampStrip } from '@/components/deals/DealCard';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActiveDealSummary } from '@/lib/deals/showcase';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Sparkles,
  Stamp,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const REWARD_ICON = {
  FIXED_DISCOUNT: Tag,
  FREE_GIFT: Gift,
  LOYALTY_POINTS: Sparkles,
  PUNCH_CARD: Stamp,
} as const;

/** Show the countdown only once it is worth reacting to. */
const URGENT_WITHIN_DAYS = 7;
const AUTOPLAY_MS = 6000;

export interface DealsShowcaseProps {
  /**
   * `marketing` is the storefront panel — one offer per screen, hero reward,
   * CTA. `compact` is the admin's read-out of the same deals with redemption
   * counts instead of a sales pitch.
   */
  variant?: 'marketing' | 'compact';
  /**
   * Deals resolved on the server. Supplied on the homepage so the band is in the
   * initial HTML; omitted in the admin dashboard, which fetches on mount.
   */
  initialDeals?: ActiveDealSummary[] | null;
  /** Autoplay is opt-out; it never runs for a single slide or under reduced motion. */
  autoplay?: boolean;
  /** Optional heading rendered above the rail. */
  heading?: ReactNode;
  /** Trailing header content, e.g. a manage link. */
  action?: ReactNode;
  className?: string;
}

/**
 * The running deals, as a self-contained carousel.
 *
 * Layout-agnostic on purpose: it brings no container, no page padding and no
 * assumptions about what sits around it, so the same component can be dropped
 * anywhere on the landing page and into the admin dashboard. It fetches its own
 * data and renders nothing at all when no deal is running — an empty
 * promotional shell is worse than no band.
 */
export default function DealsShowcase({
  variant = 'marketing',
  autoplay = true,
  initialDeals,
  heading,
  action,
  className,
}: DealsShowcaseProps) {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<ActiveDealSummary[] | null>(
    initialDeals ?? null,
  );
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Already resolved server-side on the homepage; only the admin dashboard's
    // read-out has to ask.
    if (initialDeals) {
      setDeals(initialDeals);
      return;
    }

    const controller = new AbortController();
    fetch('/api/deals/active', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((data) => setDeals(Array.isArray(data.deals) ? data.deals : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') setDeals([]);
      });
    return () => controller.abort();
  }, [initialDeals]);

  const count = deals?.length ?? 0;

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }, []);

  /** Which slide is showing, read from the scroll position rather than tracked. */
  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length === 0) return;
    const slideWidth = (track.children[0] as HTMLElement).offsetWidth || 1;
    setActive(Math.min(track.children.length - 1, Math.round(track.scrollLeft / slideWidth)));
  }, []);

  // Autoplay: never for one slide, never while the customer is on it, and never
  // when the operating system has asked for less motion.
  useEffect(() => {
    if (!autoplay || paused || count <= 1) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % count;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoplay, paused, count, scrollToIndex]);

  if (deals === null) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className={variant === 'compact' ? 'h-20 w-full' : 'h-36 w-full'} />
      </div>
    );
  }

  if (deals.length === 0) return null;

  const atStart = active === 0;
  const atEnd = active === deals.length - 1;

  return (
    <section
      aria-label={t('deals.showcase.sectionLabel')}
      aria-roledescription="carousel"
      className={cn('space-y-3', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {(heading || action || deals.length > 1) && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">{heading}</div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {deals.length > 1 && (
              <div className="flex items-center gap-1">
                <ArrowButton
                  onClick={() => scrollToIndex(Math.max(0, active - 1))}
                  disabled={atStart}
                  label={t('cart.deals.scrollPrev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </ArrowButton>
                <ArrowButton
                  onClick={() => scrollToIndex(Math.min(deals.length - 1, active + 1))}
                  disabled={atEnd}
                  label={t('cart.deals.scrollNext')}
                >
                  <ChevronRight className="h-4 w-4" />
                </ArrowButton>
              </div>
            )}
          </div>
        </div>
      )}

      <ul
        ref={trackRef}
        onScroll={syncActive}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-scrollbar]:hidden"
      >
        {deals.map((deal, index) => (
          <li
            key={deal.deal_id}
            className="w-full shrink-0 snap-start"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${deals.length}`}
          >
            {variant === 'compact' ? (
              <CompactPanel deal={deal} />
            ) : (
              <MarketingPanel deal={deal} />
            )}
          </li>
        ))}
      </ul>

      {deals.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {deals.map((deal, index) => (
            <button
              key={deal.deal_id}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={t('deals.showcase.goToSlide', { index: index + 1 })}
              aria-current={index === active}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === active ? 'w-5 bg-primary' : 'w-1.5 bg-border hover:bg-primary/40'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ArrowButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** The urgency chip. Absent unless the window really is closing. */
function EndsIn({ days }: { days: number }) {
  const { t, tPlural } = useTranslation();
  if (days > URGENT_WITHIN_DAYS) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-0.5 font-caption text-[11px] font-semibold text-primary-800">
      <Clock className="h-3 w-3" aria-hidden="true" />
      {days <= 0 ? t('deals.showcase.endsToday') : tPlural('deals.showcase.endsIn', days)}
    </span>
  );
}

/**
 * The storefront panel.
 *
 * The reward value is the hero; the admin's locked/unlocked lines are
 * deliberately not used here because both are written relative to a cart
 * ("Add ৳400 more…"), which reads as broken next to an empty one. The badge —
 * also admin-authored storefront copy — carries the deal's own naming instead.
 */
function MarketingPanel({ deal }: { deal: ActiveDealSummary }) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const Icon = REWARD_ICON[deal.reward_type] ?? Sparkles;
  const isPunchCard = deal.reward_type === 'PUNCH_CARD';

  return (
    <article className="flex h-full flex-col gap-5 rounded-md border border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
      <span
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card text-primary sm:h-20 sm:w-20"
        aria-hidden="true"
      >
        {deal.reward_preview.image ? (
          <img src={deal.reward_preview.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-7 w-7" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-caption text-[11px] font-semibold uppercase tracking-widest text-primary-700">
            {deal.reward_preview.label}
          </span>
          <EndsIn days={deal.ends_in_days} />
        </div>

        <h3 className="font-title text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          {dealHeadline(deal, t, formatPrice)}
        </h3>

        <p className="text-sm text-muted-foreground sm:text-base">
          {dealRequirement(deal, t, tPlural, formatPrice)}
          {' · '}
          {deal.settle_on === 'cart'
            ? t('deals.showcase.autoApplied')
            : t('cart.deals.creditedAfterDelivery')}
        </p>

        {isPunchCard && (
          <div className="pt-1">
            <StampStrip
              filled={0}
              total={deal.reward_detail?.stamp_target ?? Math.max(1, Math.round(deal.target))}
              label={deal.reward_preview.label}
            />
          </div>
        )}
      </div>

      <Link
        href={deal.cta_href}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-primary px-5 py-2.5 font-button text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:self-auto"
      >
        {t('deals.showcase.cta')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

/**
 * The admin read-out. Same deals, but the interesting number is how often the
 * deal has actually been redeemed, not how appealing it sounds.
 */
function CompactPanel({ deal }: { deal: ActiveDealSummary }) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const Icon = REWARD_ICON[deal.reward_type] ?? Sparkles;

  return (
    <article className="flex h-full items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card text-primary"
        aria-hidden="true"
      >
        {deal.reward_preview.image ? (
          <img src={deal.reward_preview.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-title text-sm font-semibold text-foreground">{deal.name}</p>
          <EndsIn days={deal.ends_in_days} />
        </div>
        <p className="truncate font-caption text-xs text-muted-foreground">
          {dealHeadline(deal, t, formatPrice)}
          {' · '}
          {dealRequirement(deal, t, tPlural, formatPrice)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-price text-lg font-semibold leading-none text-foreground">
          {deal.used_count}
          {deal.usage_limit ? (
            <span className="font-caption text-xs font-normal text-muted-foreground">
              {' / '}
              {deal.usage_limit}
            </span>
          ) : null}
        </p>
        <p className="font-caption text-[11px] text-muted-foreground">
          {tPlural('deals.showcase.redemptions', deal.used_count)}
        </p>
      </div>
    </article>
  );
}
