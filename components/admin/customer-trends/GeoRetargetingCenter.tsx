'use client';

import CampaignTargetingSection from '@/components/admin/customer-trends/CampaignTargetingSection';
import GeographicDemandSection from '@/components/admin/customer-trends/GeographicDemandSection';
import TrendSignalsSection from '@/components/admin/customer-trends/TrendSignalsSection';
import { DeltaValue, EmptyState } from '@/components/admin/customer-trends/shared';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DISTRICT_NAMES } from '@/lib/analytics/districts';
import {
  ALLOWED_PERIOD_DAYS,
  DEFAULT_PERIOD_DAYS,
  type PeriodDays,
  type TargetingResponse,
  type TrendSignal,
} from '@/lib/analytics/targeting';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const ALL_DISTRICTS = 'all';

export default function GeoRetargetingCenter() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const [periodDays, setPeriodDays] = useState<PeriodDays>(DEFAULT_PERIOD_DAYS);
  const [district, setDistrict] = useState<string>(ALL_DISTRICTS);
  const [data, setData] = useState<TargetingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Bumped by the refresh button; keeps the fetch effect keyed on plain values.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const params = new URLSearchParams({ periodDays: String(periodDays) });
    if (district !== ALL_DISTRICTS) params.set('district', district);

    fetch(`/api/admin/customer-trends/targeting?${params}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((payload: TargetingResponse) => {
        setData(payload);
        setLoading(false);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load targeting analytics:', cause);
        setData(null);
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [periodDays, district, reloadToken]);

  // The KPI deltas are the same numbers the API already computed for the trend
  // signals — recomputing them here would be a second source of truth.
  const kpis = useMemo(() => {
    if (!data) return [];
    const changeOf = (metric: TrendSignal['metric']) =>
      data.signals.find((signal) => signal.metric === metric)?.changePct ?? null;

    return [
      { key: 'orders', value: String(data.totals.orders), changePct: changeOf('orders') },
      {
        key: 'revenue',
        value: formatPrice(data.totals.revenue),
        changePct: changeOf('revenue'),
      },
      { key: 'aov', value: formatPrice(data.totals.aov), changePct: changeOf('aov') },
      {
        key: 'repeatRate',
        value: t('admin.customerTrends.percent', {
          value: (data.totals.repeatCustomerRate * 100).toFixed(0),
        }),
        changePct: changeOf('repeatRate'),
      },
      {
        key: 'topGrowthDistrict',
        value: data.topGrowthDistrict?.district ?? t('admin.customerTrends.notAvailable'),
        changePct: data.topGrowthDistrict?.growthOrdersPct ?? null,
      },
    ];
  }, [data, formatPrice, t]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  // The filter is stored as the Select's sentinel; every consumer below wants
  // the canonical district name or nothing.
  const selectedDistrict = district === ALL_DISTRICTS ? null : district;
  const selectDistrict = useCallback(
    (next: string | null) => setDistrict(next ?? ALL_DISTRICTS),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t('admin.customerTrends.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t('admin.customerTrends.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label htmlFor="customer-trends-period">
              {t('admin.customerTrends.filters.period')}
            </Label>
            <Select
              value={String(periodDays)}
              onValueChange={(value) => setPeriodDays(Number(value) as PeriodDays)}
            >
              <SelectTrigger id="customer-trends-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_PERIOD_DAYS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {t('admin.customerTrends.filters.lastDays', { days })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label htmlFor="customer-trends-district">
              {t('admin.customerTrends.filters.district')}
            </Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger id="customer-trends-district">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value={ALL_DISTRICTS}>
                  {t('admin.customerTrends.filters.allDistricts')}
                </SelectItem>
                {DISTRICT_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('admin.customerTrends.filters.refresh')}
          </Button>
        </div>
      </div>

      {/*
        Only the very first load takes over the page. A refetch after a filter
        change keeps the last result on screen: swapping in a spinner would
        unmount the map, throwing away its chart instance and re-fetching the
        GeoJSON every time a district is clicked.
      */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader label={t('admin.customerTrends.loading')} />
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {t('admin.customerTrends.error')}
            </p>
            <Button variant="outline" onClick={refresh}>
              {t('admin.customerTrends.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && data && (
        <div
          className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}
          aria-busy={loading}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <Card key={kpi.key}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {t(`admin.customerTrends.kpi.${kpi.key}`)}
                  </p>
                  <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-foreground">
                    {kpi.value}
                  </p>
                  <div className="mt-1 text-xs">
                    <DeltaValue changePct={kpi.changePct} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Only a period with no orders anywhere is empty. A district filter
              that matches nothing still shows the map, so the marketer can see
              where the demand actually is and click their way to it. */}
          {data.mapDistricts.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <EmptyState message={t('admin.customerTrends.empty.body')} />
              </CardContent>
            </Card>
          ) : (
            <>
              <GeographicDemandSection
                districts={data.districts}
                mapDistricts={data.mapDistricts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={selectDistrict}
              />
              <CampaignTargetingSection
                districts={data.districts}
                playbooks={data.playbooks}
                periodDays={data.period.days}
              />
              <TrendSignalsSection
                signals={data.signals}
                districts={data.districts}
                periodDays={data.period.days}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
