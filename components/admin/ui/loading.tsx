import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';

/**
 * Shared loading vocabulary for the admin panel.
 *
 * Every screen composes from these four shapes instead of hand-rolling a spinner,
 * so waits look the same everywhere and skeletons keep the page from jumping when
 * content lands. Structural skeletons (matching the real layout) live next to the
 * component they stand in for; the generic shapes here cover the common cases.
 */

/* ── Spinner-backed states: an action is in flight ─────────────────────── */

/** Whole-screen wait, e.g. the first load of a settings page. */
export function AdminPageLoader({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[60vh] flex-col items-center justify-center gap-3',
        className,
      )}
    >
      <Loader size="lg" label={null} className="text-muted-foreground" />
      <p className="font-caption text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Compact inline wait for a panel or dialog body. */
export function AdminInlineLoader({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10', className)}>
      <Loader size="md" label={null} className="text-muted-foreground" />
      {label ? (
        <span className="font-caption text-sm text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}

/**
 * Background-refresh marker: the screen already has content and is quietly
 * replacing it. Deliberately not a skeleton — swapping loaded content back out
 * for placeholders is the flicker this exists to avoid.
 */
export function AdminRefreshIndicator({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-caption text-xs text-muted-foreground',
        className,
      )}
      role="status"
    >
      <Loader size="xs" label={null} />
      {label}
    </span>
  );
}

/* ── Skeleton states: content is arriving ─────────────────────────────── */

/** Stacked text lines. The last line is short, the way real copy wraps. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

/** Placeholder for a KPI / stat row. */
export function SkeletonStatCards({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a data table, including its header row. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-border', className)}
    >
      <div
        className="flex items-center gap-4 border-b border-border bg-muted/60 px-4 py-3"
        aria-hidden="true"
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn('h-3', index === 0 ? 'w-32' : 'w-20 flex-1')}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4', columnIndex === 0 ? 'w-32' : 'w-20 flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Header block placeholder — page title plus supporting line. */
export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

/**
 * First-load placeholder for the admin list screens (header → stat row → table).
 * Preferred over a spinner for page loads: it holds the layout so nothing jumps
 * when data lands, and it tells the user what is coming.
 */
export function AdminListPageSkeleton({
  showStats = true,
  statCount = 4,
  rows = 8,
  columns = 5,
  className,
}: {
  showStats?: boolean;
  statCount?: number;
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-6', className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <SkeletonPageHeader />
      {showStats ? <SkeletonStatCards count={statCount} /> : null}
      <SkeletonTable rows={rows} columns={columns} />
    </div>
  );
}

/**
 * First-load placeholder for detail / edit screens: title, then a wide form
 * column beside a narrower sidebar column.
 */
export function AdminDetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-border bg-card p-6">
              <Skeleton className="h-4 w-40" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, field) => (
                  <div key={field} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 aspect-square w-full rounded-md" />
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-4 w-28" />
            <SkeletonText lines={3} className="mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
