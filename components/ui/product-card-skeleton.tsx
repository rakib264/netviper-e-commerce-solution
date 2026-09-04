'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { cn } from '@/lib/utils';

/**
 * Placeholders for `ProductCardRegular` and the category page's list rows.
 *
 * These mirror the real geometry rather than approximating it — same 4:5 tile,
 * same centred label stack, same rectangular add-to-bag block at the same
 * breakpoint — so nothing reflows when the products arrive. Pure CSS: one
 * `animate-pulse` on the wrapper, no per-item animation library.
 */

/** `border` and `muted` are the theme's warm neutrals; `accent` is a green. */
function Line({ className }: { className?: string }) {
  return <div className={cn('h-3 rounded-sm bg-border', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <article className="flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {/* The real CTA is rectangular and only visible below `md`, where it
            does not wait for hover. Match that so the card does not grow. */}
        <div className="absolute inset-x-3 bottom-3 h-11 rounded-none bg-card/70 md:hidden" />
      </div>

      <div className="flex flex-1 flex-col items-center pt-4">
        <Line className="h-4 w-3/4" />

        <div className="mt-3 flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[26px] w-[26px] rounded-none bg-border" />
          ))}
        </div>

        <Line className="mt-3 h-4 w-16" />
      </div>
    </article>
  );
}

export function ProductRowSkeleton() {
  return (
    <article className="flex gap-5 border-b border-border pb-6">
      <div className="h-32 w-28 shrink-0 bg-muted sm:h-40 sm:w-36" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Line className="h-2.5 w-20" />
        <Line className="mt-3 h-4 w-3/5" />
        <Line className="mt-2.5 h-3 w-24" />

        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <Line className="h-4 w-20" />
          <div className="h-10 w-32 rounded-none bg-border" />
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({
  count = 12,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-label={t('productCardSkeleton.loadingProducts')}
      className={cn(
        'grid animate-pulse grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProductListSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-label={t('productCardSkeleton.loadingProducts')}
      className={cn('animate-pulse space-y-6', className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductRowSkeleton key={index} />
      ))}
    </div>
  );
}

export default ProductGridSkeleton;
