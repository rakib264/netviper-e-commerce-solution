'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { ORDER_BINS, binColor } from '@/lib/analytics/heatmap';
import React from 'react';

/**
 * Rendered from `ORDER_BINS`, the same array the map paints from, so the swatch
 * a marketer reads here is always the swatch on the polygon.
 */
export default function HeatmapLegend() {
  const { t } = useTranslation();
  const { palette } = useTheme();

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('admin.customerTrends.geo.legend.title')}
      </p>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {ORDER_BINS.map((bin, index) => (
          <li key={bin.labelKey} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-sm border border-border"
              style={{ backgroundColor: binColor(index, palette) }}
            />
            <span className="text-xs tabular-nums text-muted-foreground">
              {t(`admin.customerTrends.geo.legend.bins.${bin.labelKey}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
