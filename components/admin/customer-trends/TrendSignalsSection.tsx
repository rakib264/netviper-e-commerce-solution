'use client';

import { ConfidenceBadge, DeltaValue, EmptyState } from '@/components/admin/customer-trends/shared';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DistrictTargeting, PeriodDays, TrendSignal } from '@/lib/analytics/targeting';
import React, { useMemo } from 'react';

interface TrendSignalsSectionProps {
  signals: TrendSignal[];
  districts: DistrictTargeting[];
  periodDays: PeriodDays;
}

const MOVERS_LIMIT = 3;

export default function TrendSignalsSection({
  signals,
  districts,
  periodDays,
}: TrendSignalsSectionProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const formatSignal = (signal: TrendSignal, value: number) => {
    if (signal.metric === 'revenue' || signal.metric === 'aov') return formatPrice(value);
    if (signal.metric === 'repeatRate') {
      return t('admin.customerTrends.percent', { value: (value * 100).toFixed(0) });
    }
    return String(value);
  };

  // Movers are limited to districts with enough orders to mean something; a
  // +400% swing off two orders is noise and would crowd out a real signal.
  const { rising, falling } = useMemo(() => {
    const comparable = districts.filter(
      (district) => district.confidence !== 'low' && district.growthOrdersPct !== null,
    );
    const sorted = [...comparable].sort(
      (a, b) => (b.growthOrdersPct ?? 0) - (a.growthOrdersPct ?? 0),
    );
    return {
      rising: sorted.filter((d) => (d.growthOrdersPct ?? 0) > 0).slice(0, MOVERS_LIMIT),
      falling: sorted
        .filter((d) => (d.growthOrdersPct ?? 0) < 0)
        .slice(-MOVERS_LIMIT)
        .reverse(),
    };
  }, [districts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.customerTrends.signals.title')}</CardTitle>
        <CardDescription>
          {t('admin.customerTrends.signals.description', { days: periodDays })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {signals.map((signal) => (
            <div
              key={signal.metric}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {t(`admin.customerTrends.signals.metric.${signal.metric}`)}
                </p>
                <ConfidenceBadge
                  confidence={signal.confidence}
                  sampleSize={signal.sampleSize}
                />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                {formatSignal(signal, signal.current)}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <DeltaValue changePct={signal.changePct} />
                <span className="text-muted-foreground">
                  {t('admin.customerTrends.signals.previousValue', {
                    value: formatSignal(signal, signal.previous),
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ['rising', rising],
              ['falling', falling],
            ] as const
          ).map(([key, movers]) => (
            <div key={key} className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t(`admin.customerTrends.signals.movers.${key}`)}
              </h3>
              {movers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('admin.customerTrends.signals.movers.empty')}
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {movers.map((district) => (
                    <li
                      key={district.district}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-medium text-foreground">{district.district}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums text-muted-foreground">
                          {t('admin.customerTrends.signals.movers.orders', {
                            current: district.orders,
                            previous: district.previousOrders,
                          })}
                        </span>
                        <DeltaValue changePct={district.growthOrdersPct} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {signals.length === 0 && (
          <EmptyState message={t('admin.customerTrends.signals.empty')} />
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('admin.customerTrends.methodology')}
        </p>
      </CardContent>
    </Card>
  );
}
