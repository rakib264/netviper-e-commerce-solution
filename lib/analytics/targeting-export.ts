import type { ClusterPlaybook, DistrictTargeting } from '@/lib/analytics/targeting';

/**
 * CSV handoff for ad ops.
 *
 * One row per district, carrying the cluster it belongs to and the budget share
 * that cluster was allocated, so the file can be dropped straight into a media
 * plan without re-reading the dashboard. Money is written as a bare number next
 * to a `currency` column — a formatted symbol would not survive a spreadsheet
 * import.
 */

const COLUMNS = [
  'cluster',
  'objective',
  'cluster_budget_share_pct',
  'district',
  'orders',
  'revenue',
  'currency',
  'avg_order_value',
  'unique_customers',
  'repeat_customer_rate_pct',
  'orders_growth_pct',
  'revenue_growth_pct',
  'delivery_success_rate_pct',
  'opportunity_score',
  'confidence',
  'top_categories',
  'top_products',
] as const;

/** RFC 4180: quote everything, double any embedded quote. */
function escapeCell(value: string | number | null): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).split('"').join('""')}"`;
}

function pct(value: number | null, digits = 1): string {
  return value === null ? '' : (value * 100).toFixed(digits);
}

export function buildTargetingCsv(
  districts: DistrictTargeting[],
  playbooks: ClusterPlaybook[],
  currency: string,
): string {
  const shareByCluster = new Map(
    playbooks.map((playbook) => [playbook.cluster, playbook.budgetShare]),
  );
  const objectiveByCluster = new Map(
    playbooks.map((playbook) => [playbook.cluster, playbook.objective]),
  );

  const rows = districts.map((district) =>
    [
      district.cluster,
      objectiveByCluster.get(district.cluster) ?? '',
      shareByCluster.get(district.cluster) ?? 0,
      district.district,
      district.orders,
      district.revenue,
      currency,
      district.aov,
      district.uniqueCustomers,
      pct(district.repeatCustomerRate),
      district.growthOrdersPct === null ? '' : district.growthOrdersPct.toFixed(1),
      district.growthRevenuePct === null ? '' : district.growthRevenuePct.toFixed(1),
      pct(district.deliverySuccessRate),
      district.opportunityScore,
      district.confidence,
      district.topCategories.map((item) => item.name).join(' | '),
      district.topProducts.map((item) => item.name).join(' | '),
    ].map(escapeCell).join(','),
  );

  return [COLUMNS.map(escapeCell).join(','), ...rows].join('\r\n');
}

/** Trigger a browser download without leaking the object URL. */
export function downloadCsv(filename: string, csv: string): void {
  // The BOM keeps Excel from mangling non-ASCII district and product names.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
