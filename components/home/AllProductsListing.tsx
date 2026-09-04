"use client";

import HomeSection from "@/components/home/HomeSection";
import SectionHeading from "@/components/home/SectionHeading";
import {
  settingNumber,
  settingString,
  type HomepageSectionProps,
} from "@/components/home/section-props";
import ViewAllLink from "@/components/home/ViewAllLink";
import { useTranslation } from "@/components/providers/LocalizationProvider";
import ProductCardRegular, {
  type Product,
} from "@/components/ui/product-card-regular";
import { useSectionData } from "@/hooks/use-section-data";
import { HOME_SECTION_HEADING_GAP } from "@/lib/home/section-spacing";
import type { StorefrontProductCard } from "@/lib/home/homepage-types";

interface AllProductsListingProps extends HomepageSectionProps {
  initialLimit?: number;
  /** Newest active products, resolved on the server. */
  initialProducts?: StorefrontProductCard[] | null;
}

const GRID =
  "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12";

export default function AllProductsListing({
  eyebrow = "Collection",
  title = "New Arrivals",
  subtitle,
  settings,
  initialLimit,
  initialProducts,
  className = "",
}: AllProductsListingProps) {
  const { t } = useTranslation();
  const limit = initialLimit ?? settingNumber(settings, "limit", 8);
  const ctaText = settingString(settings, "ctaText", "View all");
  const ctaLink = settingString(settings, "ctaLink", "/products");

  const { data, loading } = useSectionData<StorefrontProductCard[]>(
    initialProducts,
    async (signal) => {
      const response = await fetch(`/api/products/list?page=1&limit=${limit}`, {
        signal,
      });
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.success ? payload.products || [] : [];
    },
    [limit],
  );

  const products = (data || []).slice(0, limit) as unknown as Product[];

  return (
    <HomeSection className={className}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={HOME_SECTION_HEADING_GAP}
        action={
          ctaText ? (
            <ViewAllLink
              href={ctaLink}
              label={ctaText}
              ariaLabel={t("common.viewAllOf", { section: title })}
            />
          ) : null
        }
      />

      {loading ? (
        <div className={GRID} aria-busy>
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <div className="mt-3 h-4 w-3/4 bg-accent" />
              <div className="mt-2 h-3 w-1/2 bg-accent" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className={GRID}>
          {products.map((product) => (
            <ProductCardRegular key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <p className="font-caption text-sm text-muted-foreground">
          {t("home.allProductsListing.noProductsAvailable")}
        </p>
      )}
    </HomeSection>
  );
}
