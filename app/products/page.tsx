import {
  getCachedProductListingPage,
  getCachedRootCategories,
} from "@/lib/home/storefront-content";
import type { Metadata } from "next";
import ProductsPageClient from "./ProductsPageClient";

/** Matches `PAGE_SIZE` in the client, which owns pagination from here on. */
const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse the full Mascari Mart collection — handbags, shoes, wallets and travel accessories in premium leather.",
  alternates: { canonical: "/products" },
};

/**
 * Server shell for the catalogue listing.
 *
 * The listing's first, unfiltered page is the same for every visitor, so it is
 * resolved here and shipped inside the HTML. The client half still owns search,
 * filtering and pagination — it just no longer has to fetch the page the visitor
 * is already looking at.
 */
export default async function ProductsPage() {
  const [listing, categories] = await Promise.all([
    getCachedProductListingPage(PAGE_SIZE).catch(() => null),
    getCachedRootCategories(50).catch(() => null),
  ]);

  return (
    <ProductsPageClient
      initialProducts={listing?.products as never}
      initialTotal={listing?.total ?? 0}
      initialPages={listing?.pages ?? 1}
      initialCategories={categories as never}
    />
  );
}
