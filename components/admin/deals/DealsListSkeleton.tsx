import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Stand-in for `DealsList`.
 *
 * It reuses the row's exact grid template, so the real rows drop straight into
 * the space the placeholders held — no reflow when the data lands. Only the
 * list is drawn: the filter bar above it is real and already interactive during
 * the first load.
 */
export default function DealsListSkeleton({
  rows = 5,
  label,
}: {
  rows?: number;
  label: string;
}) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'grid items-center gap-3 border border-border bg-card px-3 py-3',
            'grid-cols-[auto_1fr_auto] lg:grid-cols-[auto_minmax(0,2fr)_10rem_minmax(0,1fr)_8rem_5rem_auto]',
          )}
        >
          <Skeleton className="h-4 w-4" />

          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-[min(14rem,70%)]" />
            <Skeleton className="h-3 w-[min(9rem,45%)]" />
          </div>

          <Skeleton className="hidden h-5 w-28 lg:block" />
          <Skeleton className="hidden h-3 w-24 lg:block" />

          <div className="hidden space-y-1.5 lg:block">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>

          <Skeleton className="hidden h-4 w-10 lg:block" />

          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
