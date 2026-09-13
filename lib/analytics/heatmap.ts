/**
 * Order-count bins for the district choropleth.
 *
 * The bins are **fixed**, not derived from the current maximum. A relative
 * ramp repaints every district whenever the busiest one moves, so the same
 * colour means a different thing from one period to the next and the map
 * cannot be read at a glance or compared across screenshots. Fixed cuts cost
 * some contrast on a small store and buy a legend that always means one thing.
 *
 * The legend and the map both render from this array, so they cannot drift.
 */
export interface OrderBin {
  /** Inclusive upper bound of the bin; the last is unbounded. */
  readonly max: number;
  /** Key suffix under `admin.customerTrends.geo.legend.bins`. */
  readonly labelKey: string;
  /** ThemeProvider palette token, so the ramp follows the configured theme. */
  readonly token: string;
  /** Used only before the theme palette has resolved. */
  readonly fallback: string;
}

export const ORDER_BINS: readonly OrderBin[] = [
  { max: 0, labelKey: 'zero', token: '--muted', fallback: '#e5e7eb' },
  { max: 10, labelKey: 'upTo10', token: '--info-100', fallback: '#dbeafe' },
  { max: 30, labelKey: 'upTo30', token: '--info-200', fallback: '#bfdbfe' },
  { max: 50, labelKey: 'upTo50', token: '--info-300', fallback: '#93c5fd' },
  { max: 100, labelKey: 'upTo100', token: '--info-500', fallback: '#3b82f6' },
  { max: 200, labelKey: 'upTo200', token: '--info-600', fallback: '#2563eb' },
  { max: 500, labelKey: 'upTo500', token: '--info-700', fallback: '#1d4ed8' },
  { max: Number.POSITIVE_INFINITY, labelKey: 'over500', token: '--info-900', fallback: '#172554' },
];

/** Index into `ORDER_BINS` for an order count. Negative or non-finite counts read as zero. */
export function orderBinIndex(orders: number): number {
  const count = Number.isFinite(orders) && orders > 0 ? orders : 0;
  const index = ORDER_BINS.findIndex((bin) => count <= bin.max);
  return index === -1 ? ORDER_BINS.length - 1 : index;
}

/** Resolve a bin's colour against the live theme palette. */
export function binColor(index: number, palette: Record<string, string>): string {
  const bin = ORDER_BINS[index] ?? ORDER_BINS[0];
  return palette[bin.token] || bin.fallback;
}
