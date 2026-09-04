import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Stand-in for the advertisement card grid.
 *
 * Mirrors `SortableAdCard`: the drag header strip, the media pane at the
 * family's own aspect ratio, then the copy and action row. Holding the real
 * aspect is what stops the grid jumping a card-height when the media arrives.
 */
export default function AdvertisementsSkeleton({
  cards = 3,
  aspect = 'aspect-[16/9]',
  label,
}: {
  cards?: number;
  aspect?: string;
  label: string;
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>

      {/* The blurb-and-button row above the grid. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-full max-w-xl" />
          <Skeleton className="h-3.5 w-2/3 max-w-md" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>

            <Skeleton className={cn('w-full rounded-none', aspect)} />

            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
