import { MetadataRoute } from "next";

const BASE_URL = process.env.NODE_ENV === 'production' ? "https://muscarimart.com" : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/profile/",
          "/cart/",
          "/checkout/",
          "/orders/",
          "/wishlist/",
          "/returns/",
          "/_next/",
          "/static/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/profile/",
          "/cart/",
          "/checkout/",
          "/orders/",
          "/wishlist/",
          "/returns/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
