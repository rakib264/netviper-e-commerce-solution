'use client';

import HomeSection from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import ViewAllLink from '@/components/home/ViewAllLink';
import ProductCardByStyle from '@/components/product-showcase/cards';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import type { ResolvedCuratedSection } from '@/lib/curated-sections/client-types';
import { HOME_SECTION_HEADING_GAP } from '@/lib/home/section-spacing';

/**
 * Product grid, matched to `/products` so a curated band on the homepage and
 * the listing behind its "View" button read as one system rather than two.
 */
const GRID =
  'grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12';

/**
 * A rail is a scroll-snap list, not a carousel: no library, no scroll
 * listeners, no autoplay. It stays touch-native on mobile and keyboard
 * scrollable everywhere.
 */
const RAIL =
  'flex snap-x snap-mandatory gap-x-5 overflow-x-auto pb-2 lg:gap-x-7 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const RAIL_ITEM =
  'w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-[28%] xl:w-[22%]';

/**
 * One admin-configured band of products on the homepage.
 *
 * Pure presentation: the products arrive already resolved (and already stripped
 * of their admin-only `origin` tags) from the server data layer, so this
 * component never has to know whether a tile was pinned by hand or picked by
 * the sales query.
 *
 * The three variants are complete compositions rather than a grid with knobs:
 *
 *   grid      — the catalogue grid, heading above
 *   rail      — a snap rail, for ranked lists that read left to right
 *   editorial — heading held in a column beside the products
 */
export function CuratedProductSection({
  section,
}: {
  section: ResolvedCuratedSection;
}) {
  const { t } = useTranslation();

  const products = section.products || [];
  if (products.length === 0) return null;

  const ctaLabel = (section.ctaText || '').trim() || t('home.curated.viewAll');
  const ariaLabel = t('home.curated.viewAllOf', {
    section: section.title || section.label,
  });
  const cta = section.ctaHref ? (
    <ViewAllLink href={section.ctaHref} label={ctaLabel} ariaLabel={ariaLabel} />
  ) : null;

  if (section.variant === 'editorial') {
    return (
      <HomeSection className="bg-card">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              eyebrow={section.eyebrow}
              title={section.title}
              subtitle={section.subtitle}
            />
            {cta ? <div className="mt-7">{cta}</div> : null}
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:gap-x-7 lg:gap-y-12">
            {products.map((product) => (
              <ProductCardByStyle
                key={product._id}
                style="showcase"
                product={product}
              />
            ))}
          </div>
        </div>
      </HomeSection>
    );
  }

  return (
    <HomeSection className="bg-card">
      <SectionHeading
        eyebrow={section.eyebrow}
        title={section.title}
        subtitle={section.subtitle}
        action={cta}
        className={HOME_SECTION_HEADING_GAP}
      />

      {section.variant === 'rail' ? (
        <div className={RAIL}>
          {products.map((product) => (
            <div key={product._id} className={RAIL_ITEM}>
              <ProductCardByStyle style="showcase" product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className={GRID}>
          {products.map((product) => (
            <ProductCardByStyle
              key={product._id}
              style="showcase"
              product={product}
            />
          ))}
        </div>
      )}
    </HomeSection>
  );
}

export default CuratedProductSection;
