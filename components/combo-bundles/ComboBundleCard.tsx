'use client';

import {
  comboHref,
  comboTypeKey,
  showsSavings,
} from '@/components/combo-bundles/combo-presentation';
import {
  useCurrency,
  useTranslation,
} from '@/components/providers/LocalizationProvider';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Card for one combo/bundle offer.
 *
 * Deliberately not the product card: an offer is sold on what it contains and
 * what it saves, so the composition is named on the face of the card and the
 * saving sits beside the price. The type badge is the only chrome — square,
 * mono-weight, in system tokens — because the artwork is doing the selling.
 */
export interface ComboBundleCardProps {
  combo: ResolvedComboBundle;
  /** Above-the-fold cards get a priority image; rails past the first do not. */
  priority?: boolean;
  className?: string;
  sizes?: string;
}

export default function ComboBundleCard({
  combo,
  priority = false,
  className,
  sizes = '(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 25vw',
}: ComboBundleCardProps) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();

  const image = combo.images[0];
  const showSavings = showsSavings(combo);

  return (
    <article
      className={cn(
        'group flex h-full flex-col border border-border bg-card transition-colors duration-300 hover:border-foreground/25',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link
          href={comboHref(combo.slug)}
          className="absolute inset-0 z-10"
          aria-label={combo.name}
        />

        {image ? (
          <Image
            src={image}
            alt={combo.name}
            fill
            sizes={sizes}
            priority={priority}
            className="object-contain p-4 transition-transform duration-500 motion-safe:group-hover:scale-[1.03] sm:p-5"
          />
        ) : null}

        <span className="absolute left-0 top-3 z-20 bg-foreground px-2.5 py-1 font-label text-[10px] uppercase tracking-[0.16em] text-background">
          {combo.badgeText || t(comboTypeKey(combo.comboType))}
        </span>

        {!combo.inStock ? (
          <span className="absolute inset-x-0 bottom-0 z-20 bg-foreground/85 py-2 text-center font-label text-[10px] uppercase tracking-[0.18em] text-background">
            {t('combos.soldOut')}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <p className="font-label text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {tPlural('combos.pieceCount', combo.componentCount)}
        </p>

        <Link
          href={comboHref(combo.slug)}
          className="mt-1.5 font-title text-sm leading-snug text-foreground transition-colors hover:text-muted-foreground"
        >
          {combo.name}
        </Link>

        {/*
          The composition on the card face: the offer is the reason to click,
          and "what is in it" is the question a customer asks first.
        */}
        <p className="mt-2 line-clamp-2 font-caption text-xs leading-relaxed text-muted-foreground">
          {combo.components.map((component) => component.name).join(' + ')}
        </p>

        <div className="mt-auto pt-3.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-price text-sm text-foreground">
              {formatPrice(combo.price)}
            </span>
            {showSavings ? (
              <>
                <span className="font-caption text-xs text-subtle-foreground line-through">
                  {formatPrice(combo.compareAtPrice)}
                </span>
                <span className="font-label text-[10px] uppercase tracking-[0.14em] text-foreground">
                  {t('combos.savePercent', { percent: combo.savingsPercent })}
                </span>
              </>
            ) : null}
          </div>

          <Link
            href={comboHref(combo.slug)}
            className={cn(
              'mt-3 inline-flex h-11 w-full items-center justify-center border border-border bg-card',
              'font-button text-[0.625rem] uppercase tracking-[0.18em] text-foreground',
              'transition-colors duration-300 ease-out hover:border-foreground hover:bg-foreground hover:text-background',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
            )}
          >
            {t('combos.viewDetails')}
          </Link>
        </div>
      </div>
    </article>
  );
}
