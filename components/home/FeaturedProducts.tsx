'use client';

import HomeSection from '@/components/home/HomeSection';
import SectionHeading from '@/components/home/SectionHeading';
import {
  settingNumber,
  type HomepageSectionProps,
} from '@/components/home/section-props';
import ViewAllLink from '@/components/home/ViewAllLink';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import ProductCardDiscounted from '@/components/ui/product-card-discounted';
import ProductCardRegular from '@/components/ui/product-card-regular';
import { useSectionData } from '@/hooks/use-section-data';
import { HOME_SECTION_HEADING_GAP } from '@/lib/home/section-spacing';
import type { StorefrontProductCard } from '@/lib/home/homepage-types';

export type Product = StorefrontProductCard;

interface FeaturedProductsProps extends HomepageSectionProps {
  /** Featured products, resolved on the server. */
  initialProducts?: StorefrontProductCard[] | null;
}

const GRID =
  'grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12';

export default function FeaturedProducts({
  eyebrow = 'Selected',
  title = 'Featured Products',
  subtitle,
  settings,
  initialProducts,
  className,
}: FeaturedProductsProps = {}) {
  const { t } = useTranslation();
  const limit = settingNumber(settings, 'limit', 8);

  const { data, loading } = useSectionData<StorefrontProductCard[]>(
    initialProducts,
    async (signal) => {
      const response = await fetch(
        `/api/products?featured=true&limit=${limit}&sortBy=createdAt&sortOrder=desc`,
        { signal },
      );
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.products || [];
    },
    [limit],
  );

  const items = (data || []).slice(0, limit);

  if (loading) {
    return (
      <HomeSection className="bg-gradient-to-br from-muted via-white to-info-50/20" rhythm="filled" aria-busy>
        <div className="mb-8 h-10 w-64 animate-pulse bg-muted" />
        <div className={GRID}>
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <div className="mt-3 h-4 w-3/4 bg-accent" />
              <div className="mt-2 h-3 w-1/2 bg-accent" />
            </div>
          ))}
        </div>
      </HomeSection>
    );
  }

  if (items.length === 0) return null;

  return (
    // A flat tint, not the former gradient-plus-blur-orbs-plus-floating-particles
    // stack: those seeded their positions with `Math.random()` at render time,
    // which is a hydration mismatch the moment the page renders on the server,
    // and six always-running framer-motion loops behind a product grid is
    // exactly the "flashy" the house style rules out.
    <HomeSection className="bg-gradient-to-br from-muted via-white to-info-50/20" rhythm="filled">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={HOME_SECTION_HEADING_GAP}
        action={
          <ViewAllLink
            href="/products/featured"
            label={t('common.viewAll')}
            ariaLabel={t('common.viewAllOf', { section: title })}
          />
        }
      />

      <div className={GRID}>
        {items.map((product) => {
          const hasDiscount =
            product.comparePrice != null &&
            product.comparePrice > 0 &&
            product.comparePrice > product.price;

          return hasDiscount ? (
            <ProductCardDiscounted
              key={product._id}
              product={product as never}
              className="h-full"
            />
          ) : (
            <ProductCardRegular
              key={product._id}
              product={product as never}
              className="h-full"
            />
          );
        })}
      </div>
    </HomeSection>
  );
}
