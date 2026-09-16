import {
  getCachedProductListingPage,
  getCachedRootCategories,
} from "@/lib/home/storefront-content";
import { JsonLd } from "@/lib/seo/JsonLd";
import { BRAND } from "@/lib/seo/brand";
import { answerParams } from "@/lib/seo/faq-server";
import { buildPageGraph, getSeoContext } from "@/lib/seo/graph";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  collectionPageSchema,
  itemListSchema,
  schemaId,
} from "@/lib/seo/schema";
import type { Metadata } from "next";
import ProductsPageClient from "./ProductsPageClient";

/** Matches `PAGE_SIZE` in the client, which owns pagination from here on. */
const PAGE_SIZE = 12;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: "seo.products.title",
    descriptionKey: "seo.products.description",
    descriptionValues: { brand: seo.name },
    path: "/products",
    keywords: [...BRAND.keywordSeeds],
  });
}

/**
 * Server shell for the catalogue listing.
 *
 * The listing's first, unfiltered page is the same for every visitor, so it is
 * resolved here and shipped inside the HTML. The client half still owns search,
 * filtering and pagination — it just no longer has to fetch the page the visitor
 * is already looking at.
 */
export default async function ProductsPage() {
  const [listing, categories, context] = await Promise.all([
    getCachedProductListingPage(PAGE_SIZE).catch(() => null),
    getCachedRootCategories(50).catch(() => null),
    getSeoContext(),
  ]);

  const { seo, t } = context;
  const canonical = seo.absolute("/products");
  const products = (listing?.products || []) as Array<{
    name: string;
    slug: string;
    thumbnailImage?: string;
  }>;

  const itemList = itemListSchema(seo, canonical, products);

  const answer = t("answer.products", await answerParams(context));

  const { graph } = await buildPageGraph(
    {
      path: "/products",
      name: t("seo.products.title"),
      description: t("seo.products.description", { brand: seo.name }),
      breadcrumbs: [{ name: t("seo.products.title"), path: "/products" }],
      about: [...BRAND.brandEntities],
      // `CollectionPage` rather than the default `WebPage`: it occupies the same
      // `@id`, so it replaces that node instead of competing with it.
      webPageNode: collectionPageSchema(seo, {
        canonical,
        name: t("seo.products.title"),
        description: t("seo.products.description", { brand: seo.name }),
        breadcrumbId: schemaId.breadcrumb(canonical),
        itemListId: itemList ? schemaId.itemList(canonical) : undefined,
        about: [...BRAND.brandEntities],
      }),
      nodes: [itemList],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <ProductsPageClient
        initialProducts={listing?.products as never}
        initialTotal={listing?.total ?? 0}
        initialPages={listing?.pages ?? 1}
        initialCategories={categories as never}
        answer={answer}
      />
    </>
  );
}
