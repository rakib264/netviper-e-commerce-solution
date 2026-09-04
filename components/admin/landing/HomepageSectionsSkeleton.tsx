import { Skeleton } from '@/components/ui/skeleton';
import { HOMEPAGE_SECTION_META } from '@/lib/landing/homepage-sections';

/**
 * Mirrors `SectionRow`'s geometry — handle, heading, description, the three copy
 * fields and the right-hand controls — so the list does not reflow when the real
 * rows land. Kept beside the row it stands in for; if one changes, so should the
 * other.
 */
function SectionRowSkeleton({ withFields }: { withFields: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 p-4">
        <Skeleton className="mt-1 h-7 w-7 rounded" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-3/4" />

          {withFields ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <Skeleton className="mt-3 h-3 w-1/2" />
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-6 w-11 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function HomepageSectionsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading homepage sections</span>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {/* Matches the shipped registry: the hero and showcase slots render no
            heading fields, so their placeholders are shorter. */}
        {HOMEPAGE_SECTION_META.map((meta) => (
          <SectionRowSkeleton key={meta.key} withFields={meta.supportsHeader} />
        ))}
      </div>
    </div>
  );
}

export default HomepageSectionsSkeleton;
