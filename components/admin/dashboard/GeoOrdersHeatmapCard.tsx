'use client';

import PanelCard from '@/components/admin/dashboard/PanelCard';
import HeatmapLegend from '@/components/admin/customer-trends/HeatmapLegend';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import type { DistrictHeatmapDatum } from '@/lib/analytics/targeting';
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useCallback } from 'react';

/**
 * The map engine is imported, never reimplemented — this card and
 * `/admin/customer-trends` paint from the same component and the same bin
 * scale, so a district is the same colour on both pages. amCharts is loaded
 * lazily because it is the heaviest dependency the dashboard touches.
 */
const DistrictChoroplethMap = dynamic(
  () => import('@/components/admin/customer-trends/DistrictChoroplethMap'),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted/50" /> },
);

export interface DashboardDistrictRow extends DistrictHeatmapDatum {
  previousOrders: number;
  growthOrdersPct: number | null;
  share: number;
}

interface GeoOrdersHeatmapCardProps {
  mapDistricts: DistrictHeatmapDatum[];
  topDistricts: DashboardDistrictRow[];
  totals: { orders: number; revenue: number; districts: number };
}

function GrowthCell({ value }: { value: number | null }) {
  const { t } = useTranslation();
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden="true" />
        {t('admin.dashboard.notAvailable')}
      </span>
    );
  }
  const rising = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : rising ? TrendingUp : TrendingDown;
  return (
    <span
      className={
        flat
          ? 'inline-flex items-center gap-1 text-muted-foreground'
          : rising
            ? 'inline-flex items-center gap-1 text-success'
            : 'inline-flex items-center gap-1 text-destructive'
      }
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {`${rising ? '+' : ''}${value.toFixed(1)}`}
    </span>
  );
}

export default function GeoOrdersHeatmapCard({
  mapDistricts,
  topDistricts,
  totals,
}: GeoOrdersHeatmapCardProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const tooltipFor = useCallback(
    (datum: DistrictHeatmapDatum) =>
      [
        datum.district,
        t('admin.dashboard.geo.tooltipOrders', { count: datum.orders }),
        datum.revenue > 0 ? formatPrice(datum.revenue) : null,
      ]
        .filter(Boolean)
        .join('\n'),
    [formatPrice, t],
  );

  const noSelection = useCallback(() => {}, []);

  return (
    <PanelCard
      title={t('admin.dashboard.geo.title')}
      description={t('admin.dashboard.geo.description')}
      isEmpty={mapDistricts.length === 0}
      emptyMessage={t('admin.dashboard.geo.empty')}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/customer-trends">
            {t('admin.dashboard.geo.seeMore')}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div>
          {/* Bangladesh is taller than wide and the map scales to whichever
              axis runs out first, so the column is sized to its aspect ratio
              rather than stretched across the card. */}
          <DistrictChoroplethMap
            data={mapDistricts}
            selectedDistrict={null}
            onSelectDistrict={noSelection}
            tooltipFor={tooltipFor}
            className="h-[400px] w-full rounded-lg border border-border bg-card"
          />
          <div className="mt-3">
            <HeatmapLegend />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {t('admin.dashboard.geo.totalOrders')}
              </p>
              <p className="text-lg font-semibold tabular-nums">{totals.orders}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('admin.dashboard.geo.totalRevenue')}
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatPrice(totals.revenue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('admin.dashboard.geo.activeDistricts')}
              </p>
              <p className="text-lg font-semibold tabular-nums">{totals.districts}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">
                    {t('admin.dashboard.geo.columns.district')}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t('admin.dashboard.geo.columns.orders')}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t('admin.dashboard.geo.columns.revenue')}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t('admin.dashboard.geo.columns.share')}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t('admin.dashboard.geo.columns.growth')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topDistricts.map((district) => (
                  <tr key={district.district} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-2 font-medium">{district.district}</td>
                    <td className="py-2 text-right tabular-nums">{district.orders}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPrice(district.revenue)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {t('admin.dashboard.percent', {
                        value: (district.share * 100).toFixed(1),
                      })}
                    </td>
                    <td className="py-2 text-right">
                      <GrowthCell value={district.growthOrdersPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
