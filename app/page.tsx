import HomeClient from "@/components/home/HomeClient";
import { EMPTY_HOMEPAGE_DATA, getHomepageData } from "@/lib/home/homepage-data";
import { getCachedRootCategories } from "@/lib/home/storefront-content";
import { getCachedHomepageSections } from "@/lib/landing/homepage-sections-server";
import { mergeHomepageSections } from "@/lib/landing/homepage-sections";
import { JsonLd } from "@/lib/seo/JsonLd";
import { BRAND } from "@/lib/seo/brand";
import { buildPageGraph, getSeoContext } from "@/lib/seo/graph";
import { buildMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/",
    absoluteTitle: true,
    keywords: [...BRAND.keywordSeeds],
  });
}

export default async function Home() {
  // Falls back to shipped defaults if the database is unreachable, so the
  // homepage still renders rather than erroring.
  const sections = await getCachedHomepageSections().catch(() =>
    mergeHomepageSections(null),
  );

  // The slot configuration decides *what* to read, so it has to resolve first —
  // it is a cached read, so that costs nothing. Everything the page actually
  // shows then resolves in one parallel round, and ships inside the HTML. The
  // sections used to fetch for themselves after hydration: fourteen `no-store`
  // requests behind a 367 kB bundle, which is why the page sat on skeletons.
  //
  // The SEO context and the category list join that same round rather than
  // chaining behind it — neither needs anything the homepage read produces.
  const [data, context, categories] = await Promise.all([
    getHomepageData(sections).catch(() => EMPTY_HOMEPAGE_DATA),
    getSeoContext(),
    getCachedRootCategories(12).catch(() => []),
  ]);

  const { graph } = await buildPageGraph(
    {
      path: "/",
      name: context.seo.name,
      // The product-brand entities the store actually carries. This is the
      // cheapest entity-disambiguation signal available: it tells an answer
      // engine which "Ramen Bhai" this is by naming what it sells.
      about: [...BRAND.brandEntities],
      // Only the home page declares the offer catalogue — it is a property of
      // the store, and repeating it per page would say nothing new.
      categories: (categories as Array<{ name: string; slug: string }>).map(
        (category) => ({ name: category.name, slug: category.slug }),
      ),
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <HomeClient sections={sections} data={data} />
    </>
  );
}
