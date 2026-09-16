import { CACHE_TAGS } from "@/lib/cache/tags";
import { toPlainJson } from "@/lib/home/serialize";
import Blog from "@/lib/models/Blog";
import connectDB from "@/lib/mongodb";
import { JsonLd } from "@/lib/seo/JsonLd";
import { buildPageGraph, getSeoContext } from "@/lib/seo/graph";
import { buildMetadata } from "@/lib/seo/metadata";
import { articleSchema } from "@/lib/seo/schema";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import BlogPostPageClient from "./BlogPostPageClient";

interface BlogRecord {
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  tags?: string[];
  categories?: string[];
  publishedAt?: string;
  updatedAt?: string;
  author?: { firstName?: string; lastName?: string } | null;
}

/**
 * One post, cached and tagged.
 *
 * `generateMetadata` and the page body both need it, and this file used to run
 * the same populated query twice per request — uncached, so neither paid for
 * the other. One cached reader collapses that to a single read, and the tag
 * means an admin edit still shows up immediately.
 */
const loadPost = unstable_cache(
  async (slug: string) => {
    await connectDB();

    const post = await Blog.findOne({
      slug,
      status: "published",
      isActive: true,
      publishedAt: { $lte: new Date() },
    })
      .select("-__v")
      .populate("author", "firstName lastName")
      .lean();

    return post ? toPlainJson(post as unknown as BlogRecord) : null;
  },
  ["blog-post-v1"],
  { tags: [CACHE_TAGS.blogs], revalidate: 300 },
);

/** Strip stored HTML down to the plain prose a description field wants. */
function toPlainText(html?: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function authorName(post: BlogRecord): string | undefined {
  const first = post.author?.firstName?.trim();
  const last = post.author?.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ");
  // No author falls through to the Organization in `articleSchema`, rather than
  // to an invented "<Brand> Team" person that exists nowhere else.
  return full || undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const [post, { seo, t }] = await Promise.all([
    loadPost(slug).catch(() => null),
    getSeoContext(),
  ]);

  if (!post) {
    return buildMetadata({
      titleKey: "seo.blog.notFoundTitle",
      descriptionKey: "seo.blogs.description",
      descriptionValues: { brand: seo.name },
      path: `/blogs/${slug}`,
      noindex: true,
    });
  }

  const author = authorName(post);

  return buildMetadata({
    title: post.metaTitle || post.title,
    description:
      post.metaDescription ||
      post.excerpt ||
      toPlainText(post.content) ||
      t("seo.blog.descriptionFallback", { name: post.title, brand: seo.name }),
    path: `/blogs/${slug}`,
    type: "article",
    images: post.coverImage
      ? [{ url: post.coverImage, alt: post.title }]
      : undefined,
    keywords: post.seoKeywords || post.tags || post.categories || undefined,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt || post.publishedAt,
    authors: author ? [author] : undefined,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post, context] = await Promise.all([
    loadPost(slug).catch((error) => {
      console.error("Error fetching blog post:", error);
      return null;
    }),
    getSeoContext(),
  ]);

  // A missing or unpublished post is a 404. This used to render the client
  // shell regardless, so every bad slug answered 200 with an empty article.
  if (!post) notFound();

  const { seo, t } = context;
  const canonical = seo.absolute(`/blogs/${slug}`);
  const description =
    post.excerpt ||
    toPlainText(post.content).slice(0, 300) ||
    t("seo.blog.descriptionFallback", { name: post.title, brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: `/blogs/${slug}`,
      name: post.title,
      description,
      primaryImage: post.coverImage,
      breadcrumbs: [
        { name: t("seo.blogs.title"), path: "/blogs" },
        { name: post.title, path: `/blogs/${slug}` },
      ],
      nodes: [
        articleSchema(seo, {
          canonical,
          title: post.title,
          description,
          image: post.coverImage,
          author: authorName(post),
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          tags: post.tags,
        }),
      ],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <BlogPostPageClient />
    </>
  );
}
