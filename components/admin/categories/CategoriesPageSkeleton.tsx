'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * First-load placeholder for `/admin/categories`.
 *
 * Colocated with the screen it stands in for, because it is that screen: the
 * header and its Add button, three stat cards, the three filter pills, then
 * the reorder card whose rows carry a drag handle, a 36px thumbnail, a name
 * with a status badge and a slug line. The page used to show a centred spinner
 * in an h-96 box, which suggested none of it.
 */
export default function CategoriesPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-border shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-10 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {['w-20', 'w-24', 'w-32'].map((width) => (
          <Skeleton key={width} className={`h-9 ${width}`} />
        ))}
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 p-4 sm:p-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-2 border border-border bg-card px-3 py-2.5"
              /* Every third row is a child, indented the way the tree indents
                 its subcategories. */
              style={index % 3 === 2 ? { marginLeft: 24 } : undefined}
            >
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {Array.from({ length: 3 }).map((__, action) => (
                  <Skeleton key={action} className="h-7 w-7" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
