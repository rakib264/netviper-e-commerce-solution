import HomeClient from "@/components/home/HomeClient";
import { EMPTY_HOMEPAGE_DATA, getHomepageData } from "@/lib/home/homepage-data";
import { getCachedHomepageSections } from "@/lib/landing/homepage-sections-server";
import { mergeHomepageSections } from "@/lib/landing/homepage-sections";
import type { Metadata } from "next";
import Script from "next/script";

const BASE_URL = "https://www.muscarimart.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Mascari Mart",
    description:
      "Germany-based luxury leather goods for women and men. Discover handbags, shoes, wallets, and travel accessories crafted with quiet elegance.",
    openGraph: {
      title: "Mascari Mart",
      description:
        "Germany-based luxury leather goods for women and men.",
      url: BASE_URL,
      siteName: "Mascari Mart",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: "Mascari Mart",
        },
      ],
      locale: "de_DE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Mascari Mart",
      description:
        "Germany-based luxury leather goods for women and men.",
      images: ["/logo.png"],
    },
    alternates: {
      canonical: BASE_URL,
    },
  };
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
  const data = await getHomepageData(sections).catch(() => EMPTY_HOMEPAGE_DATA);

  return (
    <>
      {/* Structured Data - Home Page */}
      <Script
        id="home-page-schema"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Mascari Mart",
            description:
              "Germany-based luxury leather goods for women and men.",
            url: BASE_URL,
            inLanguage: "en",
            isPartOf: {
              "@type": "WebSite",
              name: "Mascari Mart",
              url: BASE_URL,
            },
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: BASE_URL,
                },
              ],
            },
          }),
        }}
      />
      <HomeClient sections={sections} data={data} />
    </>
  );
}
