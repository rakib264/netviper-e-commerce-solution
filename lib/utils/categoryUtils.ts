import Category from '@/lib/models/Category';

/**
 * Every active descendant of `categoryId`, at any depth.
 *
 * Reads the active category tree once and walks it in memory. The previous
 * implementation issued one `find` per node, so a subtree of N categories cost
 * N sequential round-trips; the tree is small enough to fetch whole. The `seen`
 * set also stops a malformed parent cycle from looping forever.
 */
export async function getAllSubcategories(categoryId: string): Promise<string[]> {
  const categories = await Category.find({
    isActive: true,
    parent: { $ne: null },
  })
    .select('_id parent')
    .lean();

  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    const parentId = String((category as { parent?: unknown }).parent);
    const siblings = childrenByParent.get(parentId);
    if (siblings) siblings.push(String(category._id));
    else childrenByParent.set(parentId, [String(category._id)]);
  }

  const rootId = String(categoryId);
  const descendants: string[] = [];
  const seen = new Set<string>([rootId]);
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenByParent.get(current) || []) {
      if (seen.has(child)) continue;
      seen.add(child);
      descendants.push(child);
      queue.push(child);
    }
  }

  return descendants;
}

/**
 * The category itself plus every active descendant — the set a storefront
 * category page should list products from.
 */
export async function getCategoryScopeIds(categoryId: string): Promise<string[]> {
  return [String(categoryId), ...(await getAllSubcategories(categoryId))];
}
