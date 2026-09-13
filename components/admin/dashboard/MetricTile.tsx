'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { cn } from '@/lib/utils';
import React from 'react';

interface MetricTileProps {
  label: string;
  /** `null` renders the "not measurable" dash rather than a misleading zero. */
  value: string | number | null;
  hint?: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
  className?: string;
}

const TONE_CLASS: Record<NonNullable<MetricTileProps['tone']>, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  warning: 'text-sandy-700',
  critical: 'text-destructive',
};

/**
 * One figure with its label. A `null` value is shown as unavailable — the
 * panels never substitute a zero for something that could not be computed.
 */
export default function MetricTile({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: MetricTileProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums',
          value === null ? 'text-muted-foreground' : TONE_CLASS[tone],
        )}
      >
        {value === null ? t('admin.dashboard.notAvailable') : value}
      </p>
      {/* Hints carry the basis of the figure ("0 settled", "no promised dates"),
          so they wrap rather than truncate — a clipped basis is misleading. */}
      {hint && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Shared percentage formatter so every panel renders rates identically. */
export function usePercentFormatter() {
  const { t } = useTranslation();
  return React.useCallback(
    (value: number | null, digits = 1) =>
      value === null ? null : t('admin.dashboard.percent', { value: value.toFixed(digits) }),
    [t],
  );
}
