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
import { useSectionData } from "@/hooks/use-section-data";
import { sortCategories } from "@/lib/categories/sort";
import { HOME_SECTION_HEADING_GAP } from "@/lib/home/section-spacing";
import type { StorefrontCategory } from "@/lib/home/homepage-types";
import Image from "next/image";
import Link from "next/link";

interface ModernCategorySectionProps extends HomepageSectionProps {
  /** Root categories resolved on the server, already sorted and sliced. */
  initialCategories?: StorefrontCategory[] | null;
}

const GRID = "grid grid-cols-2 gap-5 lg:grid-cols-4";

export default function ModernCategorySection({
  eyebrow = "Shop by Category",
  title = "For Every Journey",
  subtitle,
  settings,
  initialCategories,
  className,
}: ModernCategorySectionProps = {}) {
  const { t } = useTranslation();
  const limit = settingNumber(settings, "limit", 6);
  const ctaText = settingString(settings, "ctaText", "View all categories");
  const ctaLink = settingString(settings, "ctaLink", "/categories");

  const { data, loading } = useSectionData<StorefrontCategory[]>(
    initialCategories,
    async (signal) => {
      const response = await fetch("/api/categories", { signal });
      if (!response.ok) return [];
      const payload = await response.json();
      const all: StorefrontCategory[] = payload.categories || [];
      return sortCategories(all.filter((category) => !category.parent));
    },
    [],
  );

  const categories = (data || []).slice(0, limit);

  if (loading) {
    return (
      <HomeSection aria-busy>
        <div className="mb-7 h-8 w-64 animate-pulse bg-accent" />
        <div className={GRID}>
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse bg-muted" />
          ))}
        </div>
      </HomeSection>
    );
  }

  if (categories.length === 0) return null;

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

      <div className={GRID}>
        {categories.map((category, index) => (
          <Link
            key={category._id}
            href={`/categories/${category.slug}`}
            className="group"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  // The tile grid can sit above the fold on a short viewport, so
                  // the leading row is eager and the rest lazy-load.
                  loading={index < 2 ? "eager" : "lazy"}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-end bg-muted p-6">
                  <span className="font-navigation text-2xl font-semibold text-foreground">
                    {category.name}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-3 font-navigation text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {category.name}
            </p>
          </Link>
        ))}
      </div>
    </HomeSection>
  );
}
