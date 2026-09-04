"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import BackButton from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
    BookOpen,
    Calendar,
    Clock,
    Eye,
    Heart,
    Share2,
    User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  images?: string[];
  publishedAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  categories: string[];
  tags: string[];
  readTime: number;
  viewCount: number;
  likes: number;
  isFeatured: boolean;
  allowComments: boolean;
  comments: any[];
}

interface RelatedBlog {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  categories: string[];
  readTime: number;
  viewCount: number;
}

interface BlogResponse {
  blog: Blog;
  relatedBlogs: RelatedBlog[];
}

export default function BlogPostPageClient() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<RelatedBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blogs/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/blogs");
          return;
        }
        throw new Error("Failed to fetch blog");
      }

      const data: BlogResponse = await response.json();
      setBlog(data.blog);
      setRelatedBlogs(data.relatedBlogs || []);
      setLikesCount(data.blog.likes);
    } catch (error) {
      console.error("Error fetching blog:", error);
      toast.error("Failed to load blog post");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!blog) return;

    try {
      const action = isLiked ? "unlike" : "like";
      const response = await fetch(`/api/blogs/${blog.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error("Failed to update likes");

      const data = await response.json();
      setLikesCount(data.likes);
      setIsLiked(!isLiked);
      toast.success(`Blog ${action}d successfully!`);
    } catch (error) {
      console.error("Error updating likes:", error);
      toast.error("Failed to update likes");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: blog?.title,
          text: blog?.excerpt || blog?.title,
          url: url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } catch (error) {
        toast.error("Failed to copy link");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const extractFirstParagraph = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const firstP = div.querySelector("p");
    return firstP ? firstP.textContent || "" : "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-border rounded mb-4 w-1/4"></div>
            <div className="h-64 bg-border rounded mb-8"></div>
            <div className="h-6 bg-border rounded mb-2"></div>
            <div className="h-6 bg-border rounded mb-2 w-3/4"></div>
            <div className="h-6 bg-border rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t('blogs.detail.blogPostPageClient.blogPostNotFound')}
          </h1>
          {/* <Link href="/blogs">
            <Button>
              <ArrowLeft size={16} className="mr-2" />
              Back to Blogs
            </Button>
          </Link> */}

          <div className="mb-6 md:mb-8">
            <BackButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <div className="pt-6 md:pt-8 mb-20 md:mb-0">
        {/* Header */}
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 py-4 md:py-6">
            <div className="mb-4 md:mb-6">
              <BackButton />
            </div>

            <div className="max-w-4xl mx-auto">
              {/* Blog Header */}
              <div className="space-y-4 md:space-y-6">
                {/* Categories */}
                {blog.categories.length > 0 && (
                  <motion.div
                    className="flex flex-wrap gap-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {blog.categories.map((category, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        {category}
                      </Badge>
                    ))}
                  </motion.div>
                )}

                {/* Title */}
                <motion.h1
                  className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {blog.title}
                </motion.h1>

                {/* Excerpt */}
                {blog.excerpt && (
                  <motion.p
                    className="text-lg md:text-xl text-muted-foreground leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {blog.excerpt}
                  </motion.p>
                )}

                {/* Meta Information */}
                <motion.div
                  className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-subtle-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <User size={12} className="md:w-3.5 md:h-3.5" />
                    <span className="truncate">
                      {blog?.author?.firstName} {blog?.author?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                    <span>{formatDate(blog.publishedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <Clock size={12} className="md:w-3.5 md:h-3.5" />
                    <span>{blog.readTime} {t('blogs.detail.blogPostPageClient.minRead')}</span>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <Eye size={12} className="md:w-3.5 md:h-3.5" />
                    <span>{blog.viewCount} {t('blogs.detail.blogPostPageClient.views')}</span>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <Heart size={12} className="md:w-3.5 md:h-3.5" />
                    <span>{likesCount} {t('blogs.detail.blogPostPageClient.likes')}</span>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    onClick={handleLike}
                    className="flex items-center space-x-2 h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm w-full sm:w-auto"
                  >
                    <Heart
                      size={12}
                      className={`md:w-3.5 md:h-3.5 ${isLiked ? "fill-current" : ""}`}
                    />
                    <span>{isLiked ? "Liked" : "Like"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm w-full sm:w-auto"
                  >
                    <Share2 size={12} className="mr-1 md:mr-2 md:w-3.5 md:h-3.5" />
                    {t('blogs.detail.blogPostPageClient.share')}
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Cover Image */}
            {blog.coverImage && (
              <motion.div
                className="relative h-40 sm:h-48 md:h-56 lg:h-64 xl:h-72 overflow-hidden rounded-lg mb-6 md:mb-8"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Image
                  src={blog.coverImage}
                  alt={blog.title}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1200px"
                  className="object-cover"
                  priority={false}
                />
                {blog.isFeatured && (
                  <Badge className="absolute top-4 right-4 bg-primary-600 text-white">
                    {t('blogs.detail.blogPostPageClient.featuredPost')}
                  </Badge>
                )}
              </motion.div>
            )}
            <motion.article
              className="prose prose-lg max-w-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: blog.content }}
                className="prose prose-lg prose-gray max-w-none 
                           prose-headings:text-foreground prose-headings:font-bold
                           prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm md:prose-p:text-base
                           prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
                           prose-strong:text-foreground
                           prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-primary-50 prose-blockquote:p-4
                           prose-code:bg-accent prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                           prose-pre:bg-foreground prose-pre:text-gray-100 prose-pre:text-sm
                           prose-h1:text-2xl md:prose-h1:text-3xl prose-h1:font-bold
                           prose-h2:text-xl md:prose-h2:text-2xl prose-h2:font-bold
                           prose-h3:text-lg md:prose-h3:text-xl prose-h3:font-semibold"
              />
            </motion.article>

            {/* Additional Images */}
            {blog.images && blog.images.length > 0 && (
              <motion.div
                className="mt-8 pt-6 border-t border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-4">
                  {t('blogs.detail.blogPostPageClient.gallery')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {blog.images.map((image, index) => (
                    <motion.div
                      key={index}
                      className="relative overflow-hidden rounded-lg group cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      onClick={() => {
                        // Open image in lightbox or new tab
                        window.open(image, '_blank');
                      }}
                    >
                      <Image
                        src={image}
                        alt={t('common.blogImage', { index: index + 1 })}
                        width={800}
                        height={400}
                        className="w-full h-40 sm:h-48 md:h-52 lg:h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-card bg-opacity-90 rounded-full p-2">
                            <svg
                              className="w-6 h-6 text-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tags */}
            {blog.tags.length > 0 && (
              <motion.div
                className="mt-8 pt-6 border-t border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + (blog.images?.length || 0) * 0.1 }}
              >
                <h3 className="text-base font-semibold text-foreground mb-3">
                  {t('blogs.detail.blogPostPageClient.tags')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs px-2 py-1"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Author Info */}
            <motion.div
              className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-border bg-muted rounded-lg p-4 md:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + (blog.images?.length || 0) * 0.1 }}
            >
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white md:w-5 md:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">
                    {blog?.author?.firstName} {blog?.author?.lastName}
                  </h4>
                  <p className="text-muted-foreground text-xs md:text-sm">{t('blogs.detail.blogPostPageClient.author')}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Related Posts */}
        {relatedBlogs.length > 0 && (
          <div className="bg-card py-6 md:py-8 lg:py-12">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <motion.h2
                  className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-4 md:mb-6 lg:mb-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  {t('blogs.detail.blogPostPageClient.relatedPosts')}
                </motion.h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                  {relatedBlogs.map((relatedBlog, index) => (
                    <motion.div
                      key={relatedBlog._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0 + index * 0.1 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow border-0 shadow-sm">
                        {relatedBlog.coverImage && (
                          <div className="h-32 sm:h-36 md:h-40 lg:h-44 overflow-hidden rounded-t-lg">
                            <Image
                              src={relatedBlog.coverImage}
                              alt={relatedBlog.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 400px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-3 p-3 md:p-4">
                          <div className="flex items-center justify-between text-xs font-caption text-subtle-foreground mb-2">
                            <div className="flex items-center space-x-1">
                              <User size={10} className="md:w-3 md:h-3" />
                              <span className="truncate">
                                {relatedBlog?.author?.firstName}{" "}
                                {relatedBlog?.author?.lastName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock size={10} className="md:w-3 md:h-3" />
                              <span>{relatedBlog.readTime}m</span>
                            </div>
                          </div>

                          {relatedBlog.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {relatedBlog.categories
                                .slice(0, 2)
                                .map((category, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs px-1.5 py-0.5"
                                  >
                                    {category}
                                  </Badge>
                                ))}
                            </div>
                          )}

                          <h3 className="text-sm md:text-base lg:text-lg font-bold text-foreground line-clamp-2 leading-tight">
                            {relatedBlog.title}
                          </h3>

                          {relatedBlog.excerpt && (
                            <p className="text-muted-foreground text-xs md:text-sm line-clamp-2 md:line-clamp-3 leading-relaxed">
                              {relatedBlog.excerpt}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0 p-3 md:p-4">
                          <Link href={`/blogs/${relatedBlog.slug}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-7 md:h-8 text-xs"
                            >
                              <BookOpen size={10} className="mr-1 md:mr-2 md:w-3 md:h-3" />
                              {t('blogs.detail.blogPostPageClient.readArticle')}
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
