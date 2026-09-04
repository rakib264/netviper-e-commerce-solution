import { CACHE_TAGS } from "@/lib/cache/tags";
import { sortCategories } from "@/lib/categories/sort";
import { toPlainJson } from "@/lib/home/serialize";
import Category from "@/lib/models/Category";
import connectDB from "@/lib/mongodb";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Script from "next/script";
import CategoryPageClient, {
  type CategorySummary,
} from "./CategoryPageClient";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://muscarimart.com"
    : "http://localhost:3000";

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

  try {
    const loaded = await loadCategory(slug);

    if (!loaded) {
      return {
        title: "Category Not Found | Muscari Mart",
        description: "The category you are looking for does not exist.",
      };
    }

    const { category } = loaded;
    const title = category.metaTitle || `${category.name} | Muscari Mart`;
    const description =
      category.metaDescription ||
      category.description ||
      `Browse ${category.name} at Muscari Mart — premium leather goods, crafted for everyday use.`;

    return {
      title,
      description,
      keywords: [
        category.name,
        "leather goods",
        "handbags",
        "premium",
        "Muscari Mart",
      ],
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/categories/${slug}`,
        siteName: "Muscari Mart",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: {
        canonical: `${BASE_URL}/categories/${slug}`,
      },
    };
  } catch (error) {
    console.error("Error generating category metadata:", error);
    return {
      title: "Category | Muscari Mart",
      description: "Browse our leather goods categories at Muscari Mart.",
    };
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let loaded: Awaited<ReturnType<typeof loadCategory>> = null;
  try {
    loaded = await loadCategory(slug);
  } catch (error) {
    console.error("Error loading category:", error);
  }

  // An unknown slug is a 404, not a 200 rendering an apology. `not-found.tsx`
  // in this segment supplies the branded page.
  if (!loaded) notFound();

  const { category, children } = loaded;
  const parent = category.parent;

  const breadcrumbItems = [
    { name: "Home", item: BASE_URL },
    { name: "Categories", item: `${BASE_URL}/categories` },
    ...(parent
      ? [{ name: parent.name, item: `${BASE_URL}/categories/${parent.slug}` }]
      : []),
    { name: category.name, item: `${BASE_URL}/categories/${slug}` },
  ];

  return (
    <>
      <Script
        id="category-breadcrumb-schema"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbItems.map((entry, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: entry.name,
              item: entry.item,
            })),
          }),
        }}
      />
      <CategoryPageClient
        category={toSummary(category)}
        subcategories={sortCategories(children).map(toSummary)}
      />
    </>
  );
}
