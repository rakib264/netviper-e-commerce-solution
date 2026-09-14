'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * First-load placeholder for the eight admin list screens.
 *
 * Products, Orders, Coupons, Blogs, Customers, Messaging, Audit Logs and Admin
 * Manager are the same screen with different data: a full-bleed gradient hero,
 * a row of stat cards, then a rounded card wrapping a DataTable. They share
 * this placeholder rather than the old `AdminListPageSkeleton`, which drew a
 * text line, four neutral cards and grey bars — a screen none of them is.
 *
 * The surfaces here are the real ones, not grey stand-ins: the hero gradient,
 * the tinted card backgrounds and the table head gradient are static markup
 * that never needed a fetch, so they are painted, and only the text and the
 * cells inside them are placeheld. What lands is the same page with words in
 * it, at the same size, in the same place.
 *
 * Copy is deliberately absent. The titles are duplicated nowhere, so a page
 * renamed in one place cannot start lying from the other.
 */

/** Tint families used by the tinted stat cards. Written out in full because
 *  Tailwind cannot see a class assembled from a variable. */
const STAT_TINTS = {
  primary: 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200',
  success: 'bg-gradient-to-br from-success-50 to-success-100 border-success-200',
  warning: 'bg-gradient-to-br from-warning-50 to-warning-100 border-warning-200',
  info: 'bg-gradient-to-br from-info-50 to-info-100 border-info-200',
} as const;

export type StatTint = keyof typeof STAT_TINTS;

const TINT_ORBS: Record<StatTint, string> = {
  primary: 'from-primary-400/20',
  success: 'from-success-400/20',
  warning: 'from-warning-400/20',
  info: 'from-info-400/20',
};

const TINT_ICONS: Record<StatTint, string> = {
  primary: 'bg-primary-200/50',
  success: 'bg-success-200/50',
  warning: 'bg-warning-200/50',
  info: 'bg-info-200/50',
};

const COLUMN_SPAN = ['lg:grid-cols-4', 'lg:grid-cols-5', 'lg:grid-cols-6'] as const;

function statGridClass(count: number) {
  if (count >= 6) return COLUMN_SPAN[2];
  if (count === 5) return COLUMN_SPAN[1];
  return COLUMN_SPAN[0];
}

/**
 * The gradient hero. Rendered for real — gradient, blur orbs, rounded-3xl and
 * all — with the icon tile, title, subtitle, body line and optional action
 * button placeheld at the sizes the real ones occupy.
 */
export function AdminHeroSkeleton({
  withAction = false,
  withBody = true,
}: {
  withAction?: boolean;
  withBody?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary-200/20 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600/90 to-secondary-600/90" />
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-gradient-to-tr from-white/5 to-transparent blur-2xl" />

      <div className="relative p-6 sm:p-8 lg:p-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/20 bg-card/20 p-3 backdrop-blur-sm">
                <Skeleton className="h-7 w-7 rounded-md bg-white/30" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-9 w-56 bg-white/25 sm:h-10 lg:h-12" />
                <Skeleton className="h-4 w-64 bg-white/20 lg:h-5" />
              </div>
            </div>
            {withBody && (
              <div className="max-w-2xl space-y-2">
                <Skeleton className="h-4 w-full bg-white/15" />
                <Skeleton className="h-4 w-3/5 bg-white/15" />
              </div>
            )}
          </div>
          {withAction && (
            <Skeleton className="h-12 w-40 shrink-0 rounded-xl bg-white/25" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The stat row. `tints` drives both how many cards there are and the tinted
 * look; pass `variant="glass"` for the pages whose cards are translucent white
 * rather than tinted.
 */
export function AdminStatGridSkeleton({
  tints = ['primary', 'success', 'primary', 'warning'],
  variant = 'tinted',
}: {
  tints?: StatTint[];
  variant?: 'tinted' | 'glass';
}) {
  const glass = variant === 'glass';
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6',
        statGridClass(tints.length),
      )}
    >
      {tints.map((tint, index) => (
        <Card
          key={index}
          className={cn(
            'relative overflow-hidden',
            glass
              ? 'border-0 bg-card/70 shadow-xl backdrop-blur-sm'
              : STAT_TINTS[tint],
          )}
        >
          {!glass && (
            <div
              className={cn(
                'absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-xl',
                TINT_ORBS[tint],
              )}
            />
          )}
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton
                className={cn(
                  'h-14 w-14 rounded-2xl',
                  !glass && TINT_ICONS[tint],
                )}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * The DataTable, down to its toolbar. The search field, the Filters button and
 * the export control are real chrome that sits above every one of these tables,
 * so they are drawn at their real widths; `columnWidths` lets a page describe
 * its own column rhythm instead of every screen getting the same even bars.
 */
export function AdminDataTableSkeleton({
  rows = 8,
  columnWidths = ['w-40', 'w-28', 'w-24', 'w-24', 'w-20'],
  selectable = true,
  leading = 'text',
}: {
  rows?: number;
  columnWidths?: string[];
  selectable?: boolean;
  /** What the first cell holds: plain text, a product thumbnail, or an avatar
   *  beside a name and a second line. */
  leading?: 'text' | 'thumbnail' | 'avatar';
}) {
  return (
    <div className="w-full max-w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted to-accent">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-4">
                    <Skeleton className="h-4 w-4 rounded" />
                  </th>
                )}
                {columnWidths.map((width, index) => (
                  <th key={index} className="px-4 py-4 text-left">
                    <Skeleton className={cn('h-3.5', width)} />
                  </th>
                ))}
                <th className="w-12 px-4 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {selectable && (
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-4 rounded" />
                    </td>
                  )}
                  {columnWidths.map((width, columnIndex) => (
                    <td key={columnIndex} className="px-4 py-4">
                      {columnIndex === 0 && leading === 'thumbnail' ? (
                        <Skeleton className="h-12 w-12 rounded-lg" />
                      ) : columnIndex === 0 && leading === 'avatar' ? (
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      ) : (
                        <Skeleton className={cn('h-4', width)} />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-4">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-8" />
          ))}
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * The card the DataTable sits in. Two header strips exist across these screens:
 * Products and Orders carry a tinted strip with an icon tile and a count line
 * beneath the title; the rest carry a plain or muted strip with the title only.
 */
export function AdminTableCardSkeleton({
  header = 'primary',
  ...table
}: React.ComponentProps<typeof AdminDataTableSkeleton> & {
  header?: 'primary' | 'muted' | 'plain';
}) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-0 shadow-xl',
        header === 'primary'
          ? 'rounded-3xl bg-card/80 backdrop-blur-lg'
          : 'bg-card/70 backdrop-blur-sm',
      )}
    >
      <CardHeader
        className={cn(
          header === 'primary' &&
            'border-b border-primary-100 bg-gradient-to-r from-primary-50 to-secondary-50 p-6',
          header === 'muted' && 'rounded-t-xl bg-gradient-to-r from-muted to-accent',
        )}
      >
        {header === 'primary' ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ) : (
          <Skeleton className="h-6 w-44" />
        )}
      </CardHeader>
      <CardContent className="p-6">
        <AdminDataTableSkeleton {...table} />
      </CardContent>
    </Card>
  );
}

/**
 * The whole screen. Pages pass their own stat count and column rhythm; anything
 * that is not a list-plus-stats screen composes the pieces above directly.
 */
export function AdminHeroPageSkeleton({
  withAction = false,
  tints,
  statVariant,
  rows,
  columnWidths,
  selectable,
  leading,
  header,
  children,
}: {
  withAction?: boolean;
  tints?: StatTint[];
  statVariant?: 'tinted' | 'glass';
  rows?: number;
  columnWidths?: string[];
  selectable?: boolean;
  leading?: 'text' | 'thumbnail' | 'avatar';
  header?: 'primary' | 'muted' | 'plain';
  /** Replaces the table card, for screens whose body is not a DataTable. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-secondary-50/30"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <AdminHeroSkeleton withAction={withAction} />
        {tints !== undefined && (
          <AdminStatGridSkeleton tints={tints} variant={statVariant} />
        )}
        {children ?? (
          <AdminTableCardSkeleton
            rows={rows}
            columnWidths={columnWidths}
            selectable={selectable}
            leading={leading}
            header={header}
          />
        )}
      </div>
    </div>
  );
}
