'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-border" />
            <Skeleton className="h-8 w-32 bg-border" />
            <Skeleton className="h-3 w-20 bg-border" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full bg-border" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40 bg-border" />
          <Skeleton className="h-8 w-24 bg-border" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full bg-border" style={{ height: `${height}px` }} />
      </CardContent>
    </Card>
  );
}

export function WidgetSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-border" />
          <Skeleton className="h-8 w-20 bg-border" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full bg-border" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-border" />
                  <Skeleton className="h-3 w-32 bg-border" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-20 bg-border" />
                <Skeleton className="h-3 w-16 bg-border" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border p-4 md:p-6 shadow-sm bg-card">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-border" />
            <Skeleton className="h-4 w-80 bg-border" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-32 bg-border" />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
    </div>
  );
}
