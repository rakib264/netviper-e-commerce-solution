import {
  originForAutoSource,
  type AdminCuratedProduct,
  type CuratedSection,
} from '@/lib/curated-sections/types';
import { queryProductsBySource } from '@/lib/product-showcase/resolve-products';

/**
 * Resolve the products a curated section renders, tagged with where each one
 * came from.
 *
 * The three modes differ only in which passes run:
 *
 *   manual  — the picks, in the admin's order
 *   auto    — the live query
 *   hybrid  — the picks first, then the live query topping up the remainder
 *
 * The hybrid top-up excludes the pinned ids at the database level rather than
 * de-duplicating afterwards, so a section asking for eight products gets eight
 * even when every pin would also have won the auto query on its own.
 *
 * Origins are attached here and stripped by the public route. Nothing that
 * reaches a customer carries them.
 */
export async function resolveCuratedProducts(
  section: Pick<
    CuratedSection,
    'sourceMode' | 'autoSource' | 'categorySlug' | 'manualProductIds' | 'limit'
  >,
): Promise<AdminCuratedProduct[]> {
  const limit = Math.max(1, Math.min(24, section.limit || 8));
  const manualIds = section.manualProductIds || [];

  const manual: AdminCuratedProduct[] =
    section.sourceMode === 'auto' || manualIds.length === 0
      ? []
      : (
          await queryProductsBySource({
            source: 'manual',
            productIds: manualIds,
            limit: Math.min(limit, manualIds.length),
          })
        ).map((product) => ({ ...product, origin: 'manual' as const }));

  if (section.sourceMode === 'manual') return manual.slice(0, limit);

  const remaining = limit - manual.length;
  if (remaining <= 0) return manual.slice(0, limit);

  const origin = originForAutoSource(section.autoSource);
  const auto = (
    await queryProductsBySource({
      source: section.autoSource,
      categorySlug: section.categorySlug,
      limit: remaining,
      // Pinned products must not come back a second time from the live query.
      excludeIds: manual.map((product) => product._id),
    })
  ).map((product) => ({ ...product, origin }));

  return [...manual, ...auto].slice(0, limit);
}
