'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholders for the two single-product screens.
 *
 * They used to share `AdminDetailPageSkeleton`, a two-thirds form beside a
 * square image — which is roughly the view page and nothing like the edit page,
 * a single stacked column of form cards. One shape cannot stand in for both, so
 * there are two here, each next to the screen it belongs to.
 */

/** `/admin/products/[id]` — gallery and information, with a metrics rail. */
export function ProductDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-4">
        <Skeleton className="h-10 w-24" />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              {/* A rail of thumbnails beside the main image, as the gallery
                  lays out from lg up. */}
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="hidden gap-2 lg:col-span-2 lg:flex lg:flex-col">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-20 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="aspect-square w-full rounded-lg lg:col-span-10" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {[4, 3, 3].map((rows, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: rows }).map((__, row) => (
                  <div key={row} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/** `/admin/products/[id]/edit` — the ProductForm's stack of full-width cards. */
export function ProductFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-8 w-44" />
      </div>

      {[6, 4, 4, 2].map((fields, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: fields }).map((_, field) => (
                <div key={field} className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
