'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useDebounce } from '@/hooks/use-debounce';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Eye, Filter, Grid, Heart, List, Search, SlidersHorizontal, Star, User, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Blog {
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
  tags: string[];
  readTime: number;
  viewCount: number;
  likes: number;
  isFeatured: boolean;
}

interface BlogsResponse {
  blogs: Blog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    categories: string[];
    tags: string[];
  };
}

export default function BlogsPageClient() {
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFeatured, setShowFeatured] = useState(false);
  const [sortBy, setSortBy] = useState('publishedAt');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: debouncedSearchQuery,
        category: selectedCategories.join(','),
        featured: showFeatured.toString(),
        sortBy,
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/blogs?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data: BlogsResponse = await response.json();
      
      setBlogs(data.blogs || []);
      setPagination(data.pagination || { page: 1, limit: 12, total: 0, pages: 0 });
      
      // Set all categories from response
      if (data.filters?.categories) {
        setAllCategories(data.filters.categories);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError(error instanceof Error ? error.message : t('blogs.messages.failedToFetchBlogs'));
      setBlogs([]);
      setPagination({ page: 1, limit: 12, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [page, debouncedSearchQuery, selectedCategories, showFeatured, sortBy]);

  useEffect(() => {
    // Reset page when filters change
    setPage(1);
  }, [debouncedSearchQuery, selectedCategories, showFeatured]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setShowFeatured(false);
    setPage(1);
  };

  const clearAll = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setShowFeatured(false);
    setSortBy('publishedAt');
    setPage(1);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const renderFilterContent = () => (
    <>
      {/* Categories */}
      {allCategories?.length > 0 && (
        <div>
          <h4 className="font-medium text-foreground mb-3 text-sm">{t('blogs.categories')}</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allCategories?.map((category) => (
              <label key={category} className="flex items-center space-x-3 cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors">
                <Checkbox
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => handleCategoryToggle(category)}
                  className="data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600"
                />
                <span className="text-muted-foreground text-sm font-medium">{category}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {(debouncedSearchQuery || selectedCategories?.length > 0 || showFeatured) && (
        <div>
          <h4 className="font-medium text-foreground mb-3 text-sm">{t('blogs.activeFilters')}</h4>
          <div className="space-y-2">
            {debouncedSearchQuery && (
              <Badge variant="secondary" className="text-xs">
                {t('blogs.search')} {truncateText(debouncedSearchQuery, 20)}
              </Badge>
            )}
            {showFeatured && (
              <Badge variant="secondary" className="text-xs">
                {t('blogs.featuredPosts')}
              </Badge>
            )}
            {selectedCategories.map((category) => (
              <Badge key={category} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <div className="pt-6 md:pt-8 mb-20 md:mb-0">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white py-12 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
                {t('blogs.ourBlog')}
              </h1>
              <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto leading-relaxed">
                {t('blogs.discoverInsightsTrendsAndStoriesFrom')}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Top Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Search and Mobile Filter */}
            <div className="flex-1 flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" size={18} />
                <Input
                  type="text"
                  placeholder={t('blogs.searchBlogs')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 text-sm border-border focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Mobile Filter Sheet */}
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden h-11 px-4">
                    <SlidersHorizontal size={16} className="mr-2" />
                    {t('blogs.filters')}
                    {(selectedCategories?.length > 0 || showFeatured) && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                        {selectedCategories.length + (showFeatured ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-lg text-foreground font-semibold">{t('blogs.filters')}</SheetTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="h-8 w-8 p-0 text-subtle-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </SheetHeader>
                  <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Mobile Filter Content */}
                    {renderFilterContent()}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* Featured Toggle */}
              <div className="flex bg-accent rounded-lg p-1">
                <Button
                  variant={!showFeatured ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowFeatured(false)}
                  className="h-8 px-3 text-xs"
                >
                  {t('blogs.all')}
                </Button>
                <Button
                  variant={showFeatured ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowFeatured(true)}
                  className="h-8 px-3 text-xs"
                >
                  <Star size={12} className="mr-1" />
                  {t('blogs.featured')}
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-accent rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid size={14} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List size={14} />
                </Button>
              </div>

              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publishedAt">{t('blogs.latest')}</SelectItem>
                  <SelectItem value="viewCount">{t('blogs.mostViewed')}</SelectItem>
                  <SelectItem value="likes">{t('blogs.mostLiked')}</SelectItem>
                  <SelectItem value="title">{t('blogs.titleAZ')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block lg:w-80">
              <div className="sticky top-6">
                <Card className="border-0 shadow-sm bg-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Filter size={18} />
                        {t('blogs.filters')}
                      </h3>
                      {(selectedCategories?.length > 0 || showFeatured) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearFilters}
                          className="text-subtle-foreground hover:text-foreground text-xs"
                        >
                          {t('blogs.clear')}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {renderFilterContent()}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">

              {/* Blog Content */}
              {error ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-destructive-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-destructive-500 text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('blogs.errorLoadingBlogs')}</h3>
                  <p className="text-muted-foreground mb-4 text-sm">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setError(null);
                      fetchBlogs();
                    }}
                  >
                    {t('blogs.tryAgain')}
                  </Button>
                </div>
              ) : loading ? (
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="bg-border h-48 rounded-lg mb-4"></div>
                      <div className="bg-border h-4 rounded mb-2"></div>
                      <div className="bg-border h-4 rounded mb-2 w-3/4"></div>
                      <div className="bg-border h-4 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : blogs.length > 0 ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={viewMode}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
                    >
                      {blogs.map((blog, index) => (
                        <motion.div
                          key={blog._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {viewMode === 'grid' ? (
                            <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-card group">
                              {blog.coverImage && (
                                <div className="relative h-48 overflow-hidden rounded-t-lg">
                                  <img 
                                    src={blog.coverImage} 
                                    alt={blog.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  {blog.isFeatured && (
                                    <Badge className="absolute top-3 right-3 bg-primary-600 text-white">
                                      <Star size={10} className="mr-1" />
                                      {t('blogs.featured')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between text-xs font-caption text-subtle-foreground mb-2">
                                  <div className="flex items-center space-x-1">
                                    <User size={12} />
                                    <span>{blog?.author?.firstName} {blog?.author?.lastName}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Calendar size={12} />
                                    <span>{formatDate(blog?.publishedAt)}</span>
                                  </div>
                                </div>
                                
                                {blog?.categories?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {blog?.categories?.slice(0, 2).map((category, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                                        {category}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                
                                <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2 leading-tight">
                                  {blog?.title}
                                </h3>
                                
                                {blog?.excerpt && (
                                  <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                                    {blog?.excerpt}
                                  </p>
                                )}
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3 text-xs font-caption text-subtle-foreground">
                                    <div className="flex items-center space-x-1">
                                      <Clock size={12} />
                                      <span>{blog?.readTime}m</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Eye size={12} />
                                      <span>{blog?.viewCount}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Heart size={12} />
                                      <span>{blog?.likes}</span>
                                    </div>
                                  </div>
                                  <Link href={`/blogs/${blog?.slug}`}>
                                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                                      {t('blogs.readMore')}
                                      <ArrowRight size={12} className="ml-1" />
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-card group">
                              <div className="flex flex-col md:flex-row">
                                {blog.coverImage && (
                                  <div className="relative h-48 md:h-32 md:w-48 overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-t-none">
                                    <img 
                                      src={blog.coverImage} 
                                      alt={blog.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {blog.isFeatured && (
                                      <Badge className="absolute top-2 right-2 bg-primary-600 text-white">
                                        <Star size={10} className="mr-1" />
                                        {t('blogs.featured')}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex-1 p-4">
                                  <div className="flex items-center justify-between text-xs font-caption text-subtle-foreground mb-2">
                                    <div className="flex items-center space-x-2">
                                      <User size={12} />
                                      <span>{blog?.author?.firstName} {blog?.author?.lastName}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Calendar size={12} />
                                      <span>{formatDate(blog?.publishedAt)}</span>
                                    </div>
                                  </div>
                                  
                                  {blog?.categories?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {blog?.categories?.slice(0, 2).map((category, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                                          {category}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2 leading-tight">
                                    {blog?.title}
                                  </h3>
                                  
                                  {blog?.excerpt && (
                                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-3">
                                      {blog?.excerpt}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 text-xs font-caption text-subtle-foreground">
                                      <div className="flex items-center space-x-1">
                                        <Clock size={12} />
                                        <span>{blog?.readTime}m</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Eye size={12} />
                                        <span>{blog?.viewCount}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Heart size={12} />
                                        <span>{blog?.likes}</span>
                                      </div>
                                    </div>
                                    <Link href={`/blogs/${blog?.slug}`}>
                                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                                        {t('blogs.readMore')}
                                        <ArrowRight size={12} className="ml-1" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex justify-center mt-8">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="h-9 px-3 text-sm"
                        >
                          {t('blogs.previous')}
                        </Button>
                        
                        {Array.from({ length: Math.min(5, pagination.pages) }).map((_, idx) => {
                          const pageNum = idx + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className="w-9 h-9 p-0 text-sm"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                          disabled={page === pagination.pages}
                          className="h-9 px-3 text-sm"
                        >
                          {t('blogs.next')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-subtle-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('blogs.noBlogsFound')}</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {debouncedSearchQuery || selectedCategories.length > 0 || showFeatured
                      ? t('blogs.tryAdjustingYourSearchCriteria')
                      : t('blogs.noBlogPostsHaveBeenPublished')}
                  </p>
                  {(debouncedSearchQuery || selectedCategories.length > 0 || showFeatured) && (
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      {t('blogs.clearAllFilters')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

