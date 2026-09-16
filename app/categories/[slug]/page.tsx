import { CACHE_TAGS } from "@/lib/cache/tags";
import { sortCategories } from "@/lib/categories/sort";
import { toPlainJson } from "@/lib/home/serialize";
import Category from "@/lib/models/Category";
import connectDB from "@/lib/mongodb";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLd } from "@/lib/seo/JsonLd";
import { faqsForCategory } from "@/lib/seo/faq";
import { resolveFaqsForPage } from "@/lib/seo/faq-server";
import { BRAND } from "@/lib/seo/brand";
import { buildPageGraph, getSeoContext } from "@/lib/seo/graph";
import { buildMetadata } from "@/lib/seo/metadata";
import { collectionPageSchema, faqSchema, schemaId } from "@/lib/seo/schema";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import CategoryPageClient, {
  type CategorySummary,
} from "./CategoryPageClient";

interface CategoryRecord {
  _id: unknown;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  parent?: { _id: unknown; name: string; slug: string } | null;
}

/**
 * The category and its direct children, loaded once on the server.
 *
 * The client used to pull the entire `/api/categories` payload just to find one
 * category by slug; the page already had to query it here for metadata, so it is
 * handed down as a prop instead.
 *
 * Cached and tagged, which also collapses the duplicate read this page used to
 * make: `generateMetadata` and the page body both call it, and both used to pay
 * for the same two queries.
 */
const loadCategory = unstable_cache(
  async (slug: string) => {
    await connectDB();

    const category = (await Category.findOne({ slug, isActive: true })
      .populate("parent", "name slug")
      .lean()) as CategoryRecord | null;

    if (!category) return null;

    const children = (await Category.find({
      parent: category._id,
      isActive: true,
    })
      .select("name slug sortOrder")
      .lean()) as unknown as CategoryRecord[];

    return toPlainJson({ category, children });
  },
  ["category-page-v1"],
  { tags: [CACHE_TAGS.categories], revalidate: 300 },
);

function toSummary(category: CategoryRecord): CategorySummary {
  return {
    _id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description || undefined,
    image: category.image || undefined,
    parent: category.parent
      ? {
          _id: String(category.parent._id),
          name: category.parent.name,
          slug: category.parent.slug,
        }
      : null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const [loaded, { seo, t }] = await Promise.all([
    loadCategory(slug).catch(() => null),
    getSeoContext(),
  ]);

  if (!loaded) {
    return buildMetadata({
      titleKey: "seo.category.notFoundTitle",
      descriptionKey: "seo.categories.description",
      descriptionValues: { brand: seo.name },
      path: `/categories/${slug}`,
      noindex: true,
    });
  }

  const { category } = loaded;

  return buildMetadata({
    title: category.metaTitle || category.name,
    description:
      category.metaDescription ||
      category.description ||
      t("seo.category.descriptionFallback", {
        name: category.name,
        brand: seo.name,
      }),
    path: `/categories/${slug}`,
    images: category.image ? [{ url: category.image, alt: category.name }] : undefined,
    keywords: [category.name, ...BRAND.keywordSeeds.slice(0, 8)],
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [loaded, context] = await Promise.all([
    loadCategory(slug).catch((error) => {
      console.error("Error loading category:", error);
      return null;
    }),
    getSeoContext(),
  ]);

  // An unknown slug is a 404, not a 200 rendering an apology. `not-found.tsx`
  // in this segment supplies the branded page.
  if (!loaded) notFound();

  const { category, children } = loaded;
  const { seo, t } = context;
  const parent = category.parent;
  const canonical = seo.absolute(`/categories/${slug}`);

  const description =
    category.metaDescription ||
    category.description ||
    t("seo.category.descriptionFallback", {
      name: category.name,
      brand: seo.name,
    });

  // Matched against the category's slug and name, so renaming a category does
  // not lose its FAQs, and a category with no match falls back to the general
  // set rather than answering questions about something it does not sell.
  const faqs = await resolveFaqsForPage(faqsForCategory(category), context);

  const { graph } = await buildPageGraph(
    {
      path: `/categories/${slug}`,
      name: category.name,
      description,
      primaryImage: category.image || undefined,
      breadcrumbs: [
        { name: t("seo.categories.title"), path: "/categories" },
        ...(parent
          ? [{ name: parent.name, path: `/categories/${parent.slug}` }]
          : []),
        { name: category.name, path: `/categories/${slug}` },
      ],
      webPageNode: collectionPageSchema(seo, {
        canonical,
        name: category.name,
        description,
        breadcrumbId: schemaId.breadcrumb(canonical),
      }),
      nodes: [faqSchema(canonical, faqs)],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <CategoryPageClient
        category={toSummary(category)}
        subcategories={sortCategories(children).map(toSummary)}
      />
      <FaqSection faqs={faqs} heading={t("faq.sectionHeading")} />
    </>
  );
}
