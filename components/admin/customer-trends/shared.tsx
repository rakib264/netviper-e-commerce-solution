'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import type { ClusterKey, ConfidenceLevel } from '@/lib/analytics/targeting';
import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

const CLUSTER_VARIANT: Record<ClusterKey, 'success' | 'info' | 'warning' | 'subtle'> = {
  scale: 'success',
  defend: 'info',
  test: 'warning',
  watch: 'subtle',
};

const CONFIDENCE_VARIANT: Record<ConfidenceLevel, 'outline-success' | 'outline-sandy' | 'outline'> =
  {
    high: 'outline-success',
    medium: 'outline-sandy',
    low: 'outline',
  };

export function ClusterBadge({ cluster }: { cluster: ClusterKey }) {
  const { t } = useTranslation();
  return (
    <Badge variant={CLUSTER_VARIANT[cluster]}>
      {t(`admin.customerTrends.cluster.${cluster}`)}
    </Badge>
  );
}

export function ConfidenceBadge({
  confidence,
  sampleSize,
}: {
  confidence: ConfidenceLevel;
  sampleSize: number;
}) {
  const { t, tPlural } = useTranslation();
  return (
    <Badge
      variant={CONFIDENCE_VARIANT[confidence]}
      title={tPlural('admin.customerTrends.confidence.sample', sampleSize)}
    >
      {t(`admin.customerTrends.confidence.${confidence}`)}
    </Badge>
  );
}

/**
 * A period-over-period delta. `null` means the previous period had nothing to
 * compare against — shown as such rather than as a 0% or an infinite gain.
 */
export function DeltaValue({
  changePct,
  className,
}: {
  changePct: number | null;
  className?: string;
}) {
  const { t } = useTranslation();

  if (changePct === null) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-muted-foreground', className)}>
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('admin.customerTrends.noBaseline')}
      </span>
    );
  }

  const rising = changePct > 0;
  const flat = changePct === 0;
  const Icon = flat ? Minus : rising ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums',
        flat ? 'text-muted-foreground' : rising ? 'text-success' : 'text-destructive',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t('admin.customerTrends.percentChange', {
        value: `${rising ? '+' : ''}${changePct.toFixed(1)}`,
      })}
    </span>
  );
}

/** Empty state used by every section, so "no data" never looks like a bug. */
export function EmptyState({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        {t('admin.customerTrends.empty.title')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/** Percentage formatted from a 0–1 ratio. */
export function useRatioFormatter() {
  const { t } = useTranslation();
  return React.useCallback(
    (ratio: number | null, digits = 0) =>
      ratio === null
        ? t('admin.customerTrends.notAvailable')
        : t('admin.customerTrends.percent', { value: (ratio * 100).toFixed(digits) }),
    [t],
  );
}
