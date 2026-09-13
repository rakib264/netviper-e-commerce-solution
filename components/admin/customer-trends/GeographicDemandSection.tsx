'use client';

import HeatmapLegend from '@/components/admin/customer-trends/HeatmapLegend';
import { ClusterBadge, ConfidenceBadge, DeltaValue, EmptyState, useRatioFormatter } from '@/components/admin/customer-trends/shared';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { binColor, orderBinIndex } from '@/lib/analytics/heatmap';
import type { DistrictHeatmapDatum, DistrictTargeting } from '@/lib/analytics/targeting';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useMemo } from 'react';

// amCharts touches `window` at import time and is the heaviest dependency on
// the page, so the map is loaded only once this section is actually rendered.
const DistrictChoroplethMap = dynamic(
  () => import('@/components/admin/customer-trends/DistrictChoroplethMap'),
  { ssr: false },
);

const TABLE_ROW_LIMIT = 12;
const RANK_LIMIT = 8;

interface GeographicDemandSectionProps {
  districts: DistrictTargeting[];
  /** Whole-country roll-up for the period; unaffected by the district filter. */
  mapDistricts: DistrictHeatmapDatum[];
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export default function GeographicDemandSection({
  districts,
  mapDistricts,
  selectedDistrict,
  onSelectDistrict,
}: GeographicDemandSectionProps) {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const { palette } = useTheme();
  const formatRatio = useRatioFormatter();

  // Already sorted by the API; sliced here so the ranking stays beside the map.
  const ranked = useMemo(() => mapDistricts.slice(0, RANK_LIMIT), [mapDistricts]);

  const tooltipFor = useCallback(
    (datum: DistrictHeatmapDatum) =>
      [
        datum.district,
        tPlural('admin.customerTrends.confidence.sample', datum.orders),
        datum.revenue > 0 ? formatPrice(datum.revenue) : null,
      ]
        .filter(Boolean)
        .join('\n'),
    [formatPrice, tPlural],
  );

  const rows = useMemo(
    () =>
      [...districts]
        .sort((a, b) => b.orders - a.orders || a.district.localeCompare(b.district))
        .slice(0, TABLE_ROW_LIMIT),
    [districts],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.customerTrends.geo.title')}</CardTitle>
        <CardDescription>{t('admin.customerTrends.geo.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/*
          The map is always rendered: it is the country-wide picture, and a
          filter that emptied it would look like a failure, not a filter.

          Bangladesh is taller than it is wide, and a map series scales to fit
          whichever axis runs out first. In a full-width band that is the
          height, which left the country drawn at a third of the available
          width and reading as empty space. The map column is therefore sized
          to roughly the country's own aspect ratio, and the width this frees
          up carries the legend and the ranking.
        */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <DistrictChoroplethMap
            data={mapDistricts}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={onSelectDistrict}
            tooltipFor={tooltipFor}
            className="h-[480px] w-full rounded-lg border border-border bg-card"
          />

          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {t('admin.customerTrends.geo.mapHint')}
              </p>
              {selectedDistrict && (
                <Badge variant="subtle" className="gap-1.5">
                  {selectedDistrict}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    aria-label={t('admin.customerTrends.geo.clearSelection')}
                    onClick={() => onSelectDistrict(null)}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </Badge>
              )}
            </div>

            <HeatmapLegend />

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('admin.customerTrends.geo.rankTitle')}
              </h3>
              {ranked.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('admin.customerTrends.geo.empty')}
                </p>
              ) : (
                <ul className="space-y-1">
                  {ranked.map((datum) => {
                    const isSelected = datum.district === selectedDistrict;
                    return (
                      <li key={datum.district}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectDistrict(isSelected ? null : datum.district)
                          }
                          aria-pressed={isSelected}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                            isSelected && 'bg-muted font-medium',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0 rounded-sm border border-border"
                            style={{
                              backgroundColor: binColor(
                                orderBinIndex(datum.orders),
                                palette,
                              ),
                            }}
                          />
                          <span className="flex-1 truncate">{datum.district}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {datum.orders}
                          </span>
                          <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                            {formatPrice(datum.revenue)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {districts.length === 0 ? (
          <EmptyState message={t('admin.customerTrends.geo.empty')} />
        ) : (
          <>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('admin.customerTrends.geo.tableTitle')}
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.customerTrends.geo.columns.district')}</TableHead>
                      <TableHead className="text-right">
                        {t('admin.customerTrends.geo.columns.orders')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('admin.customerTrends.geo.columns.revenue')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('admin.customerTrends.geo.columns.aov')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('admin.customerTrends.geo.columns.repeat')}
                      </TableHead>
                      <TableHead>{t('admin.customerTrends.geo.columns.growth')}</TableHead>
                      <TableHead className="text-right">
                        {t('admin.customerTrends.geo.columns.delivery')}
                      </TableHead>
                      <TableHead>{t('admin.customerTrends.geo.columns.topDemand')}</TableHead>
                      <TableHead>{t('admin.customerTrends.geo.columns.cluster')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((district) => (
                      <TableRow key={district.district}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {district.district}
                            <ConfidenceBadge
                              confidence={district.confidence}
                              sampleSize={district.orders}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {district.orders}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(district.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(district.aov)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRatio(district.repeatCustomerRate)}
                        </TableCell>
                        <TableCell>
                          <DeltaValue changePct={district.growthOrdersPct} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRatio(district.deliverySuccessRate)}
                        </TableCell>
                        <TableCell className="max-w-[220px] text-muted-foreground">
                          {district.topCategories.length > 0 || district.topProducts.length > 0
                            ? (district.topCategories.length > 0
                                ? district.topCategories
                                : district.topProducts
                              )
                                .map((item) => item.name)
                                .join(', ')
                            : t('admin.customerTrends.notAvailable')}
                        </TableCell>
                        <TableCell>
                          <ClusterBadge cluster={district.cluster} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
