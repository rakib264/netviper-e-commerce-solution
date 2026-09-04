import type { CuratedProduct, CuratedSection } from '@/lib/curated-sections/types';

/**
 * What `/api/curated-sections` returns and the homepage renders.
 *
 * Kept in its own module so client components can import the shape without
 * pulling in the normalisation and routing helpers — and, more importantly, so
 * the storefront type is `CuratedProduct` (no `origin`) rather than the admin
 * one. A component typed against this cannot render an internal label even if
 * a payload somehow carried one.
 */
export interface ResolvedCuratedSection extends CuratedSection {
  products: CuratedProduct[];
}
