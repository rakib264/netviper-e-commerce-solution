import { MetadataRoute } from "next";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import Blog from "@/lib/models/Blog";
import Category from "@/lib/models/Category";
import Event from "@/lib/models/Event";

const BASE_URL = process.env.NODE_ENV === 'production' ? "https://muscarimart.com" : "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Try to connect to database, but handle failures gracefully during build
  let isDbConnected = false;
  try {
    await connectDB();
    isDbConnected = true;
    console.log("[Sitemap] Database connected successfully");
  } catch (error) {
    console.warn(
      "[Sitemap] Database connection failed during build, using static routes only:",
      error instanceof Error ? error.message : String(error),
    );
    isDbConnected = false;
  }

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/products/featured`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/products/new-arrivals`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/products/best-selling`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/products/limited-edition`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blogs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/deals`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/faqs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/shipping-delivery`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms-conditions`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Dynamic routes (only if database is connected)
  let productRoutes: MetadataRoute.Sitemap = [];
  let categoryRoutes: MetadataRoute.Sitemap = [];
  let blogRoutes: MetadataRoute.Sitemap = [];
  let eventRoutes: MetadataRoute.Sitemap = [];

  if (isDbConnected) {
    try {
      // Dynamic product routes
      const products = await Product.find({ isActive: true })
        .select("slug updatedAt")
        .lean();

      productRoutes = products.map((product) => ({
        url: `${BASE_URL}/products/${product.slug}`,
        lastModified: product.updatedAt || new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

      // Dynamic category routes
      const categories = await Category.find({ isActive: true })
        .select("slug updatedAt")
        .lean();

      categoryRoutes = categories.map((category) => ({
        url: `${BASE_URL}/categories/${category.slug}`,
        lastModified: category.updatedAt || new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

      // Dynamic blog routes (only published blogs)
      const blogs = await Blog.find({
        status: "published",
        isActive: true,
        publishedAt: { $lte: new Date() },
      })
        .select("slug updatedAt publishedAt")
        .lean();

      blogRoutes = blogs.map((blog) => ({
        url: `${BASE_URL}/blogs/${blog.slug}`,
        lastModified: blog.updatedAt || blog.publishedAt || new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));

      // Dynamic event routes (only active events)
      const events = await Event.find({ isActive: true })
        .select("_id updatedAt")
        .lean();

      eventRoutes = events.map((event) => ({
        url: `${BASE_URL}/events/${event._id}`,
        lastModified: event.updatedAt || new Date(),
        changeFrequency: "daily" as const,
        priority: 0.6,
      }));

      console.log(
        `[Sitemap] Generated ${productRoutes.length} product routes, ${categoryRoutes.length} category routes, ${blogRoutes.length} blog routes, ${eventRoutes.length} event routes`,
      );
    } catch (error) {
      console.warn(
        "[Sitemap] Error fetching dynamic routes, using static routes only:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } else {
    console.log("[Sitemap] Database not connected, using static routes only");
  }

  return [
    ...staticRoutes,
    ...productRoutes,
    ...categoryRoutes,
    ...blogRoutes,
    ...eventRoutes,
  ];
}
