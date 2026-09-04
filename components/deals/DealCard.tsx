'use client';

import { dealHeadline, dealRequirement } from '@/components/deals/deal-presentation';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import type { DealProgress } from '@/lib/deals/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, Check, Gift, Sparkles, Stamp, Tag } from 'lucide-react';

export const REWARD_ICON = {
  FIXED_DISCOUNT: Tag,
  FREE_GIFT: Gift,
  LOYALTY_POINTS: Sparkles,
  PUNCH_CARD: Stamp,
} as const;

/**
 * One deal, in either of the two places a deal is shown.
 *
 * `cart` is progress-aware: it renders against the customer's live total, so it
 * carries a bar or a stamp strip and flips to an unlocked state. `showcase` is
 * an advert — no cart to measure, so it states the condition and the reward.
 */
export default function DealCard({
  progress,
  variant = 'cart',
}: {
  progress: DealProgress;
  variant?: 'cart' | 'showcase';
}) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const Icon = REWARD_ICON[progress.reward_type] ?? Sparkles;
  const detail = progress.reward_detail ?? {};
  const unlocked = progress.unlocked;
  const isPunchCard = progress.reward_type === 'PUNCH_CARD';
  const headline = dealHeadline(progress, t, formatPrice);
  const isShowcase = variant === 'showcase';

  const stampCount = isPunchCard
    ? t('cart.deals.stampProgress', {
        current: detail.stamps_filled ?? progress.current,
        total: detail.stamp_target ?? progress.target,
      })
    : null;

  if (isShowcase) {
    return (
      <article className="flex h-full flex-col gap-4 rounded-md border border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card text-primary sm:h-16 sm:w-16"
          aria-hidden="true"
        >
          {progress.reward_preview.image ? (
            <img
              src={progress.reward_preview.image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-caption text-[11px] font-semibold uppercase tracking-widest text-primary-700">
            {progress.reward_preview.label}
          </p>
          <h3 className="font-title text-xl font-semibold leading-tight text-foreground sm:text-2xl">
            {headline}
          </h3>
          <p className="text-sm text-muted-foreground">
            {dealRequirement(progress, t, tPlural, formatPrice)}
            {' · '}
            {progress.settle_on === 'cart'
              ? t('deals.showcase.autoApplied')
              : t('cart.deals.creditedAfterDelivery')}
          </p>
          {isPunchCard && (
            <div className="pt-1">
              <StampStrip
                filled={0}
                total={detail.stamp_target ?? Math.max(1, Math.round(progress.target))}
                label={progress.reward_preview.label}
              />
            </div>
          )}
        </div>

        <Link
          href="/products"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-primary px-4 py-2 font-button text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:self-auto"
        >
          {t('deals.showcase.cta')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'flex h-full items-start gap-2 rounded-md border px-2 py-1.5 transition-colors',
        unlocked ? 'border-primary/35 bg-primary/[0.055]' : 'border-border bg-muted/40'
      )}
    >
      {/* The gift's own thumbnail where there is one, greyed until it is really
          in the cart. */}
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border',
          unlocked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground'
        )}
        aria-hidden="true"
      >
        {progress.reward_preview.image ? (
          <img
            src={progress.reward_preview.image}
            alt=""
            className={cn('h-full w-full object-cover', !unlocked && 'opacity-70 grayscale')}
          />
        ) : unlocked ? (
          <Check className="h-3 w-3" />
        ) : (
          <Icon className="h-3 w-3" />
        )}
      </span>

      {/* Two lines, always: the reward and its state on one, the progress on
          the next. In a drawer the card is competing with the item list for
          height, and a third line of prose costs more than it explains. */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          {/* While locked, the merchant's own line already names the reward and
              what is left to earn it, so repeating it as a heading would be the
              same sentence twice. Once unlocked it stops doing that job, so the
              reward itself takes the line and the message is dropped — the
              badge beside it already says the deal applied. */}
          <p
            className={cn(
              'text-sm leading-snug text-foreground',
              unlocked && 'truncate font-title font-semibold'
            )}
          >
            {unlocked ? headline : progress.message}
          </p>
          {/* Only the unlocked state is badged. A "locked" pill on every card is
              chrome saying what the progress bar already says. */}
          {unlocked && (
            <span className="flex shrink-0 items-center gap-1 font-caption text-[10px] font-semibold uppercase tracking-wide text-primary-700">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t('cart.deals.unlockedBadge')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPunchCard ? (
            <>
              <StampStrip
                filled={detail.stamps_filled ?? Math.floor(progress.current)}
                total={detail.stamp_target ?? Math.max(1, Math.floor(progress.target))}
                label={progress.reward_preview.label}
              />
              <span className="ml-auto shrink-0 font-caption text-[11px] font-medium text-subtle-foreground">
                {stampCount}
              </span>
            </>
          ) : (
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progress.reward_preview.label}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * The punch card's own progress bar. A stamp strip says "collect these" in a
 * way a percentage cannot, and the count is what the customer is tracking, so
 * it is rendered as slots rather than a fill.
 */
export function StampStrip({
  filled,
  total,
  label,
}: {
  filled: number;
  total: number;
  label: string;
}) {
  const { t } = useTranslation();
  const slots = Math.min(Math.max(1, total), 24);
  const stamped = Math.min(Math.max(0, filled), slots);

  return (
    <div
      className="flex flex-wrap gap-1"
      role="progressbar"
      aria-valuenow={stamped}
      aria-valuemin={0}
      aria-valuemax={slots}
      aria-label={label}
      aria-valuetext={t('cart.deals.stampProgress', {
        current: stamped,
        total: slots,
      })}
    >
      {Array.from({ length: slots }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-4 w-4 rounded-full border transition-colors',
            index < stamped ? 'border-primary bg-primary' : 'border-dashed border-border bg-card'
          )}
        />
      ))}
    </div>
  );
}
