import type { Metadata } from "next";
import connectDB from "@/lib/mongodb";
import Blog from "@/lib/models/Blog";
import BlogPostPageClient from "./BlogPostPageClient";
import Script from "next/script";

const BASE_URL = process.env.NODE_ENV === 'production' ? "https://muscarimart.com" : "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    await connectDB();
    const blog = await Blog.findOne({
      slug,
      status: "published",
      isActive: true,
      publishedAt: { $lte: new Date() },
    })
      .populate("author", "firstName lastName")
      .lean();

    if (!blog) {
      return {
        title: "Blog Post Not Found | Muscari Mart",
        description: "The blog post you are looking for does not exist.",
      };
    }

    const blogData = blog as any;
    const title = blogData.metaTitle || `${blogData.title} | Muscari Mart`;
    const description =
      blogData.metaDescription ||
      blogData.excerpt ||
      (blogData.content
        ? blogData.content.replace(/<[^>]*>/g, "").substring(0, 160)
        : `Read ${blogData.title} on Muscari Mart blog.`);

    const authorName =
      (blogData.author as any)?.firstName && (blogData.author as any)?.lastName
        ? `${(blogData.author as any).firstName} ${(blogData.author as any).lastName}`
        : "Muscari Mart Team";

    const publishedDate = blogData.publishedAt
      ? new Date(blogData.publishedAt).toISOString()
      : new Date().toISOString();
    const coverImage = blogData.coverImage || "/logo.png";

    return {
      title,
      description,
      keywords:
        blogData.seoKeywords || blogData.tags || blogData.categories || [],
      authors: [{ name: authorName }],
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/blogs/${slug}`,
        siteName: "Muscari Mart",
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: blogData.title,
          },
        ],
        type: "article",
        publishedTime: publishedDate,
        authors: [authorName],
        section: blogData.categories?.[0] || "Fashion",
        tags: blogData.tags || [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [coverImage],
      },
      alternates: {
        canonical: `${BASE_URL}/blogs/${slug}`,
      },
    };
  } catch (error) {
    console.error("Error generating blog metadata:", error);
    return {
      title: "Blog Post | Muscari Mart",
      description: "Read our latest blog posts about fashion and lifestyle.",
    };
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch blog for structured data
  let blog = null;
  try {
    await connectDB();
    blog = await Blog.findOne({
      slug,
      status: "published",
      isActive: true,
      publishedAt: { $lte: new Date() },
    })
      .populate("author", "firstName lastName email")
      .lean();
  } catch (error) {
    console.error("Error fetching blog for structured data:", error);
  }

  return (
    <>
      {blog &&
        (() => {
          const blogData = blog as any;
          return (
            <Script
              id="blog-article-schema"
              type="application/ld+json"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BlogPosting",
                  headline: blogData.title,
                  description:
                    blogData.excerpt ||
                    (blogData.content
                      ? blogData.content
                          .replace(/<[^>]*>/g, "")
                          .substring(0, 200)
                      : ""),
                  image: blogData.coverImage ? [blogData.coverImage] : [],
                  datePublished: blogData.publishedAt
                    ? new Date(blogData.publishedAt).toISOString()
                    : new Date().toISOString(),
                  dateModified: blogData.updatedAt
                    ? new Date(blogData.updatedAt).toISOString()
                    : new Date().toISOString(),
                  author: {
                    "@type": "Person",
                    name:
                      (blogData.author as any)?.firstName &&
                      (blogData.author as any)?.lastName
                        ? `${(blogData.author as any).firstName} ${(blogData.author as any).lastName}`
                        : "Muscari Mart Team",
                  },
                  publisher: {
                    "@type": "Organization",
                    name: "Muscari Mart",
                    logo: {
                      "@type": "ImageObject",
                      url: `${BASE_URL}/logo.png`,
                    },
                  },
                  mainEntityOfPage: {
                    "@type": "WebPage",
                    "@id": `${BASE_URL}/blogs/${slug}`,
                  },
                  articleSection: blogData.categories?.[0] || "Fashion",
                  keywords:
                    blogData.tags?.join(", ") ||
                    blogData.categories?.join(", ") ||
                    "",
                  wordCount: blogData.content
                    ? blogData.content.replace(/<[^>]*>/g, "").split(/\s+/)
                        .length
                    : 0,
                  timeRequired: `PT${blogData.readTime || 5}M`,
                }),
              }}
            />
          );
        })()}
      <BlogPostPageClient />
    </>
  );
}
