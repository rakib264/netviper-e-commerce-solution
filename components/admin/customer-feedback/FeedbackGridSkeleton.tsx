'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder for the feedback grid on `/admin/customer-feedback`.
 *
 * The page's header and filter card never needed the fetch and stay mounted;
 * this replaces the centred spinner that used to stand in for the cards. Each
 * tile carries the same four bands as a real one — the coloured platform strip,
 * the customer row, the message with its rating pill, and the action row — so
 * the grid does not reflow when the reviews arrive.
 */
export default function FeedbackGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="h-full">
          <CardContent className="p-0">
            <div className="flex items-center justify-between bg-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>

            <div className="border-b p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>

            <div className="border-b p-4">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
              <Skeleton className="mt-3 h-6 w-24 rounded-full" />
            </div>

            <div className="flex items-center justify-end gap-2 p-4">
              {Array.from({ length: 3 }).map((__, action) => (
                <Skeleton key={action} className="h-9 w-9" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
