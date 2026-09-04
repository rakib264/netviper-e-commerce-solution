import { getPublicProductDetail } from "@/lib/products/detail-server";
import type { Metadata } from "next";
import Script from "next/script";
import ProductPageClient from "./ProductPageClient";
import { DEFAULT_CURRENCY } from "@/lib/currency/config";
import { getServerCurrency } from "@/lib/currency/server";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://muscarimart.com"
    : "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Shared cache entry with the page body below and with
    // `/api/products/[slug]`, so all three cost one read.
    const [{ product }, currency] = await Promise.all([
      getPublicProductDetail(slug),
      getServerCurrency(),
    ]);

    if (!product) {
      return {
        title: "Product Not Found | Mascari Mart",
        description: "The product you are looking for does not exist.",
      };
    }

    const productData = product as any;
    const title = productData.metaTitle || `${productData.name} | Mascari Mart`;
    const description =
      productData.metaDescription ||
      productData.shortDescription ||
      (productData.description
        ? productData.description.substring(0, 160).replace(/<[^>]*>/g, "")
        : `Discover ${productData.name} at Mascari Mart. Premium leather goods designed for modern timeless style.`);

    const images =
      productData.images && productData.images.length > 0
        ? productData.images
        : [productData.thumbnailImage];

    const price =
      productData.comparePrice && productData.comparePrice > productData.price
        ? productData.comparePrice
        : productData.price;

    const availability =
      productData.quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";
    const categoryName = (productData.category as any)?.name || "Leather Goods";

    return {
      title,
      description,
      keywords: productData.seoKeywords ||
        productData.tags || [productData.name, categoryName],
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/products/${slug}`,
        siteName: "Mascari Mart",
        images: images.slice(0, 4).map((img: string) => ({
          url: img,
          width: 1200,
          height: 630,
          alt: productData.name,
        })),
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [productData.thumbnailImage],
      },
      alternates: {
        canonical: `${BASE_URL}/products/${slug}`,
      },
      other: {
        "product:price:amount": price.toString(),
        "product:price:currency": currency,
        "product:availability": availability,
        "product:condition": "new",
      },
    };
  } catch (error) {
    console.error("Error generating product metadata:", error);
    return {
      title: "Product | Mascari Mart",
      description: "Browse premium leather goods at Mascari Mart.",
    };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // One read for the JSON-LD block *and* for the page content: the client
  // component receives the product as a prop instead of refetching it after
  // hydration, so the PDP is server-rendered.
  let product: Record<string, any> | null = null;
  let relatedProducts: Array<Record<string, any>> = [];
  // Schema.org requires an ISO code; it must be the store's, not a baked-in EUR.
  let currency: string = DEFAULT_CURRENCY;
  try {
    const [detail, resolvedCurrency] = await Promise.all([
      getPublicProductDetail(slug),
      getServerCurrency(),
    ]);
    product = detail.product;
    relatedProducts = detail.relatedProducts;
    currency = resolvedCurrency;
  } catch (error) {
    console.error("Error fetching product:", error);
  }

  return (
    <>
      {product &&
        (() => {
          const productData = product as any;
          return (
            <Script
              id="product-schema"
              type="application/ld+json"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Product",
                  name: productData.name,
                  description:
                    productData.shortDescription ||
                    (productData.description
                      ? productData.description
                          .replace(/<[^>]*>/g, "")
                          .substring(0, 500)
                      : ""),
                  image:
                    productData.images && productData.images.length > 0
                      ? productData.images
                      : [productData.thumbnailImage],
                  sku: productData.sku,
                  brand: {
                    "@type": "Brand",
                    name: "Mascari Mart",
                  },
                  offers: {
                    "@type": "Offer",
                    url: `${BASE_URL}/products/${slug}`,
                    priceCurrency: currency,
                    price: productData.price,
                    priceValidUntil: new Date(
                      Date.now() + 365 * 24 * 60 * 60 * 1000,
                    )
                      .toISOString()
                      .split("T")[0],
                    itemCondition: "https://schema.org/NewCondition",
                    availability:
                      productData.quantity > 0
                        ? "https://schema.org/InStock"
                        : "https://schema.org/OutOfStock",
                    seller: {
                      "@type": "Organization",
                      name: "Mascari Mart",
                    },
                  },
                  aggregateRating:
                    productData.averageRating > 0
                      ? {
                          "@type": "AggregateRating",
                          ratingValue: productData.averageRating,
                          reviewCount: productData.totalReviews || 0,
                          bestRating: "5",
                          worstRating: "1",
                        }
                      : undefined,
                  category:
                    (productData.category as any)?.name || "Leather Goods",
                  additionalProperty: [
                    {
                      "@type": "PropertyValue",
                      name: "Total Sales",
                      value: productData.totalSales || 0,
                    },
                  ],
                }),
              }}
            />
          );
        })()}
      <ProductPageClient
        initialProduct={product as never}
        initialRelatedProducts={relatedProducts as never}
      />
    </>
  );
}
