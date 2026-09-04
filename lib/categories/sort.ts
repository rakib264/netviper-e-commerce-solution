/** Shared sort for category trees (admin order → storefront). */
export function byCategorySortOrder<
  T extends { sortOrder?: number; name?: string },
>(a: T, b: T): number {
  const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return (a.name || '').localeCompare(b.name || '');
}

export function sortCategories<T extends { sortOrder?: number; name?: string }>(
  items: T[],
): T[] {
  return [...items].sort(byCategorySortOrder);
}
