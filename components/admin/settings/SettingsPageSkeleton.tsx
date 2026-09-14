'use client';

import {
  AdminHeroSkeleton,
} from '@/components/admin/ui/hero-page-skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * First-load placeholder for `/admin/settings`.
 *
 * The screen is a gradient hero, a seven-tab bar and a long form; it used to
 * show a centred spinner, which suggested none of that and let the tab bar
 * appear only once four settings endpoints had all answered. The tab strip and
 * the form's field rhythm are held here so the page does not jump into place.
 */
export default function SettingsPageSkeleton() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-secondary-50/30"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <AdminHeroSkeleton withAction withBody={false} />

        <div className="space-y-6">
          {/* Tab strip: two columns on phones, four then seven as it widens. */}
          <div className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>

          {/* Sub-tab strip belonging to the General tab, which opens first. */}
          <div className="flex flex-wrap gap-1 p-1">
            {['w-28', 'w-24', 'w-32', 'w-24', 'w-28'].map((width) => (
              <Skeleton key={width} className={`h-9 ${width}`} />
            ))}
          </div>

          {Array.from({ length: 2 }).map((_, card) => (
            <Card key={card}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-5 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((__, field) => (
                    <div key={field} className="space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
                <Skeleton className="mt-6 h-10 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
