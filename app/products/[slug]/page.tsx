import { getServerCurrency } from "@/lib/currency/server";
import { getPublicProductDetail } from "@/lib/products/detail-server";
import { getCachedReturnPolicy } from "@/lib/returns/policy-settings-server";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLd } from "@/lib/seo/JsonLd";
import { faqsForProduct } from "@/lib/seo/faq";
import { resolveFaqsForPage } from "@/lib/seo/faq-server";
import { buildPageGraph, getSeoContext } from "@/lib/seo/graph";
import { buildMetadata } from "@/lib/seo/metadata";
import { faqSchema, productSchema, type ProductSchemaInput } from "@/lib/seo/schema";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductPageClient from "./ProductPageClient";

/** Strip stored HTML down to the plain prose a description field wants. */
function toPlainText(html?: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** The images a product has, richest source first. */
function productImages(product: Record<string, any>): string[] {
  const images: string[] = Array.isArray(product.images) ? product.images : [];
  const all = images.length ? images : [product.thumbnailImage];
  return all.filter((image): image is string => Boolean(image));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Shared cache entry with the page body below and with
  // `/api/products/[slug]`, so all three cost one read.
  const [detail, { seo, t }] = await Promise.all([
    getPublicProductDetail(slug).catch(() => null),
    getSeoContext(),
  ]);

  const product = detail?.product as Record<string, any> | undefined;

  if (!product) {
    return buildMetadata({
      titleKey: "seo.product.notFoundTitle",
      descriptionKey: "seo.product.notFoundDescription",
      descriptionValues: { brand: seo.name },
      path: `/products/${slug}`,
      noindex: true,
    });
  }

  // Admin-authored SEO fields win; otherwise the product's own copy, and only
  // then a generated sentence. `buildMetadata` handles the length limits, so
  // none of these branches has to think about truncation.
  const description =
    product.metaDescription ||
    product.shortDescription ||
    toPlainText(product.description) ||
    t("seo.product.descriptionFallback", { name: product.name, brand: seo.name });

  return buildMetadata({
    title: product.metaTitle || product.name,
    description,
    path: `/products/${slug}`,
    type: "product",
    images: productImages(product)
      .slice(0, 4)
      .map((url) => ({ url, alt: product.name })),
    keywords: product.seoKeywords || product.tags || undefined,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // One read for the JSON-LD block *and* for the page content: the client
  // component receives the product as a prop instead of refetching it after
  // hydration, so the PDP is server-rendered. The currency, returns policy and
  // SEO context are all cached reads with no dependency on the product, so they
  // resolve in the same round rather than behind it.
  const [detail, currency, returnPolicy, context] = await Promise.all([
    getPublicProductDetail(slug).catch((error) => {
      console.error("Error fetching product:", error);
      return null;
    }),
    getServerCurrency(),
    getCachedReturnPolicy().catch(() => null),
    getSeoContext(),
  ]);

  // An unknown slug is a 404, not a 200 rendering an empty shell. Without this
  // the page answered 200 for every mistyped URL, which is how a catalogue ends
  // up with thousands of indexed near-empty pages.
  if (!detail?.product) notFound();

  const product = detail.product as Record<string, any>;
  const { seo, t } = context;
  const category = product.category as { name?: string; slug?: string } | undefined;

  const schemaInput: ProductSchemaInput = {
    name: product.name,
    description:
      product.shortDescription || toPlainText(product.description).slice(0, 500),
    images: productImages(product),
    slug,
    price: product.price,
    comparePrice: product.comparePrice,
    quantity: product.quantity,
    // Emitted only when the product actually carries them — an invented SKU is
    // a duplicate-product signal and an invented GTIN is a feed rejection.
    sku: product.sku || undefined,
    barcode: product.barcode || undefined,
    brandName: product.brand || undefined,
    categoryName: category?.name,
    averageRating: product.averageRating,
    totalReviews: product.totalReviews,
    reviews: Array.isArray(product.reviews) ? product.reviews : undefined,
  };

  // Only questions answerable from brand.ts or the product row. Genuinely
  // per-product facts — spice level, cooking time, allergens — are deliberately
  // absent: they belong in product fields, and a template that invents them is
  // how a catalogue ends up asserting a cooking time for a bottle of soy sauce.
  const faqs = await resolveFaqsForPage(
    faqsForProduct({ name: product.name, categoryName: category?.name }),
    context,
  );

  const { graph } = await buildPageGraph(
    {
      path: `/products/${slug}`,
      name: product.name,
      description: schemaInput.description,
      primaryImage: productImages(product)[0],
      breadcrumbs: [
        { name: t("seo.products.title"), path: "/products" },
        ...(category?.slug && category.name
          ? [{ name: category.name, path: `/categories/${category.slug}` }]
          : []),
        { name: product.name, path: `/products/${slug}` },
      ],
      nodes: [
        productSchema(seo, schemaInput, {
          currency,
          returnPolicy: returnPolicy
            ? {
                returnWindowDays: returnPolicy.returnWindowDays,
                freeReturnShipping: returnPolicy.freeReturnShipping,
              }
            : undefined,
        }),
        faqSchema(seo.absolute(`/products/${slug}`), faqs),
      ],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <ProductPageClient
        initialProduct={product as never}
        initialRelatedProducts={detail.relatedProducts as never}
      />
      <FaqSection faqs={faqs} heading={t("faq.sectionHeading")} />
    </>
  );
}
