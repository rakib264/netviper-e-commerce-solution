'use client';

import NestedCategoryTree from '@/components/categories/NestedCategoryTree';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import AddToCartButton from '@/components/ui/add-to-cart-button';
import { addToWishlist, removeFromWishlist } from '@/lib/store/slices/wishlistSlice';
import { RootState } from '@/lib/store/store';
import { formatEuroCurrency } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Grid, Heart, List, Search, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: any;
  children?: Category[];
  productCount?: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  averageRating?: number;
  totalReviews?: number;
  description: string;
  shortDescription?: string;
  quantity?: number;
  category?: {
    name: string;
    slug: string;
  };
}

const sortOptions = [
  { value: 'newest', labelKey: 'common.sort.newestFirst' },
  { value: 'price-asc', labelKey: 'common.sort.priceLowToHigh' },
  { value: 'price-desc', labelKey: 'common.sort.priceHighToLow' },
  { value: 'rating', labelKey: 'common.sort.highestRated' },
  { value: 'name', labelKey: 'common.sort.nameAZ' }
];

const colors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Gray', 'Pink', 'Purple'];

function ExplorePageContent() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [minRating, setMinRating] = useState(0);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Initialize categories first
  useEffect(() => {
    fetchCategories();
  }, []);

  // Initialize from URL params after categories are loaded
  useEffect(() => {
    if (categories.length === 0) return;
    
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    
    if (categoryParam) {
      const category = categories.find(cat => cat.slug === categoryParam);
      if (category) {
        setSelectedCategory(category);
      }
    }
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams, categories]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const categoriesArray = data.categories || [];
      setCategories(categoriesArray);
      return categoriesArray;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));
      
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory.slug);
      if (priceRange[0] > 0) params.set('minPrice', String(priceRange[0]));
      if (priceRange[1] < 50000) params.set('maxPrice', String(priceRange[1]));
      if (minRating > 0) params.set('minRating', String(minRating));
      if (selectedColors.length > 0) params.set('color', selectedColors.join(','));
      
      // Handle sorting
      const [sortField, sortOrder] = sortBy.includes('-') 
        ? sortBy.split('-') 
        : [sortBy, sortBy === 'price' ? 'asc' : 'desc'];
      
      params.set('sortBy', sortField === 'price' ? 'price' : sortField === 'rating' ? 'averageRating' : sortField === 'name' ? 'name' : 'createdAt');
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data.products || []);
      setPagination(prev => ({ 
        ...prev, 
        total: data.pagination.total, 
        pages: data.pagination.pages 
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, priceRange, minRating, selectedColors, sortBy, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Remove handleAddToCart as it's now handled by AddToCartButton component

  const handleWishlistToggle = (product: Product) => {
    const isInWishlist = wishlistItems.some(item => item.id === product._id);
    
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
    } else {
      dispatch(addToWishlist({
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.thumbnailImage,
        comparePrice: product.comparePrice,
        inStock: (product.quantity ?? 0) > 0
      }));
    }
  };

  const formatPrice = (price: number) => {
    return formatEuroCurrency(price);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPriceRange([0, 50000]);
    setMinRating(0);
    setSelectedColors([]);
    setSortBy('newest');
    setSelectedCategory(null);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = searchQuery || selectedCategory || minRating > 0 || selectedColors.length > 0 || priceRange[0] > 0 || priceRange[1] < 50000;

  const renderFilters = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <h4 className="font-medium mb-3">{t('explore.search')}</h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder={t('explore.searchProducts')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-medium mb-3">{t('explore.priceRange')}</h4>
        <Slider
          value={priceRange}
          onValueChange={(value) => {
            setPriceRange([value[0] ?? 0, value[1] ?? 50000]);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          max={50000}
          step={1000}
          className="py-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
          <span>{formatPrice(priceRange[0])}</span>
          <span>{formatPrice(priceRange[1])}</span>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h4 className="font-medium mb-3">{t('explore.colors')}</h4>
        <div className="grid grid-cols-2 gap-2">
          {colors.map((color) => (
            <div key={color} className="flex items-center space-x-2">
              <Checkbox
                id={`color-${color}`}
                checked={selectedColors.includes(color)}
                onCheckedChange={() => toggleColor(color)}
              />
              <label htmlFor={`color-${color}`} className="text-sm cursor-pointer">
                {color}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="font-medium mb-3">{t('explore.minimumRating')}</h4>
        <div className="space-y-2">
          {[4, 3, 2, 1].map(rating => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${rating}`}
                checked={minRating === rating}
                onCheckedChange={() => {
                  setMinRating(minRating === rating ? 0 : rating);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              />
              <label htmlFor={`rating-${rating}`} className="flex items-center space-x-1 text-sm cursor-pointer">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < rating ? 'text-warning-400 fill-current' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span>{t('explore.up')}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button onClick={clearFilters} variant="outline" className="w-full">
          {t('explore.clearAllFilters')}
        </Button>
      )}
    </div>
  );

  const renderProductCard = (product: Product, index: number) => {
    const isInWishlist = wishlistItems.some(item => item.id === product._id);

    return (
      <motion.div
        key={product._id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -4 }}
      >
        <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
          {viewMode === 'grid' ? (
            <>
              <div className="relative overflow-hidden">
                <Link href={`/products/${product.slug}`}>
                  <img
                    src={product.thumbnailImage}
                    alt={product.name}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </Link>
                
                {product.comparePrice && (
                  <Badge className="absolute top-3 right-3 bg-destructive-500">
                    {t('common.percentOff', { percent: Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) })}
                  </Badge>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="p-2"
                    onClick={() => handleWishlistToggle(product)}
                  >
                    <Heart 
                      size={16} 
                      className={isInWishlist ? 'fill-current text-destructive-500' : ''} 
                    />
                  </Button>
                  <AddToCartButton
                    productId={product._id}
                    productName={product.name}
                    productPrice={product.price}
                    productImage={product.thumbnailImage}
                    productSlug={product.slug}
                    variant="default"
                    size="sm"
                    availableStock={product.quantity}
                    isOutOfStock={product.quantity === 0}
                    text={t('explore.addToCart')}
                  />
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={`${
                          i < Math.floor(product.averageRating || 0)
                            ? 'text-warning-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({product.totalReviews || 0})
                  </span>
                </div>
                
                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {product.shortDescription || product.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-price font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-sm font-caption text-muted-foreground line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity lg:flex hidden">
                    <AddToCartButton
                      productId={product._id}
                      productName={product.name}
                      productPrice={product.price}
                      productImage={product.thumbnailImage}
                      productSlug={product.slug}
                      variant="icon-only"
                      size="sm"
                      availableStock={product.quantity}
                      isOutOfStock={product.quantity === 0}
                      className="border border-border bg-card hover:bg-muted"
                    />
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            // List view similar to the existing products page
            <div className="flex">
              <div className="relative w-48 flex-shrink-0">
                <Link href={`/products/${product.slug}`}>
                  <img
                    src={product.thumbnailImage}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                </Link>
                {product.comparePrice && (
                  <Badge className="absolute top-3 right-3 bg-destructive-500">
                    {t('common.percentOff', { percent: Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) })}
                  </Badge>
                )}
              </div>
              
              <CardContent className="flex-1 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={`${
                              i < Math.floor(product.averageRating || 0)
                                ? 'text-warning-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({product.totalReviews || 0})
                      </span>
                      {product.category?.name && (
                        <Badge variant="outline" className="ml-4">
                          {product.category.name}
                        </Badge>
                      )}
                    </div>
                    
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="text-xl font-semibold mb-2">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <p className="text-muted-foreground mb-4">
                      {product.shortDescription || product.description}
                    </p>
                    
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-2xl font-price font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      {product.comparePrice && (
                        <span className="text-lg font-caption text-muted-foreground line-through">
                          {formatPrice(product.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-6">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="p-2"
                      onClick={() => handleWishlistToggle(product)}
                    >
                      <Heart 
                        size={16} 
                        className={isInWishlist ? 'fill-current text-destructive-500' : ''} 
                      />
                    </Button>
                    <AddToCartButton
                      productId={product._id}
                      productName={product.name}
                      productPrice={product.price}
                      productImage={product.thumbnailImage}
                      productSlug={product.slug}
                      variant="default"
                      size="md"
                      availableStock={product.quantity}
                      isOutOfStock={product.quantity === 0}
                      text={t('explore.addToCart')}
                      className="px-6"
                    />
                  </div>
                </div>
              </CardContent>
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-card">
      <Header />
      
      <div className="container mx-auto px-4 py-4 md:py-8 mt-16 md:mt-20 mb-20 md:mb-0">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            {selectedCategory ? t('explore.categoryProducts', { category: selectedCategory.name }) : t('explore.exploreProducts')}
          </h1>
          <p className="text-muted-foreground">
            {selectedCategory 
              ? t('explore.discoverCategoryProducts', { category: selectedCategory.name.toLowerCase() }) 
              : t('explore.discoverOurCompleteCollectionOfPremium')
            }
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar - Categories & Filters */}
          <div className="hidden lg:block space-y-6">
            <NestedCategoryTree 
              onCategorySelect={handleCategorySelect}
              selectedCategory={selectedCategory}
            />
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <Filter className="mr-2" size={18} />
                  {t('explore.filters')}
                </h3>
                {renderFilters()}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Controls Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Mobile Filters */}
                  <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden">
                        <Filter size={16} className="mr-2" />
                        {t('explore.filters')}
                        {hasActiveFilters && (
                          <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                            !
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0">
                      <div className="p-6 border-b">
                        <h3 className="font-semibold text-lg">{t('explore.filtersCategories')}</h3>
                      </div>
                      <div className="p-6 space-y-6 overflow-y-auto">
                        <NestedCategoryTree 
                          onCategorySelect={(category) => {
                            handleCategorySelect(category);
                            setShowMobileFilters(false);
                          }}
                          selectedCategory={selectedCategory}
                          className="mb-6"
                        />
                        {renderFilters()}
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t('explore.sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode & Results Count */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    {products.length} {t('explore.of')} {pagination.total} {t('explore.products')}
                  </p>
                  
                  <div className="flex border rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-3"
                    >
                      <Grid size={16} />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-3"
                    >
                      <List size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{t('explore.activeFilters')}</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      "{searchQuery}"
                      <X 
                        size={12} 
                        className="cursor-pointer" 
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedCategory.name}
                      <X 
                        size={12} 
                        className="cursor-pointer" 
                        onClick={() => setSelectedCategory(null)}
                      />
                    </Badge>
                  )}
                  {selectedColors.map((color) => (
                    <Badge key={color} variant="secondary" className="gap-1">
                      {color}
                      <X 
                        size={12} 
                        className="cursor-pointer" 
                        onClick={() => toggleColor(color)}
                      />
                    </Badge>
                  ))}
                  {minRating > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      {t('common.minRatingStars', { rating: minRating })}
                      <X 
                        size={12} 
                        className="cursor-pointer" 
                        onClick={() => setMinRating(0)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </motion.div>

            {/* Products Grid */}
            <motion.div
              layout
              className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' 
                  : 'grid-cols-1'
              }`}
            >
              <AnimatePresence>
                {loading ? (
                  [...Array(6)].map((_, index) => (
                    <div key={index} className="animate-pulse border rounded-lg h-80 bg-muted/30" />
                  ))
                ) : products.map((product, index) => renderProductCard(product, index))}
              </AnimatePresence>
            </motion.div>

            {/* No Results */}
            {!loading && products.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">{t('explore.noProductsFound')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('explore.tryAdjustingYourSearchCriteriaOr')}
                </p>
                <Button onClick={clearFilters}>{t('explore.clearAllFilters')}</Button>
              </motion.div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1 || loading}
                >
                  {t('explore.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('common.pageOf', { page: pagination.page, pages: pagination.pages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages || loading}
                >
                  {t('explore.next')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-card">
        <Header />
        <div className="container mx-auto px-4 py-4 md:py-8 mt-16 md:mt-20 mb-20 md:mb-0">
          <div className="animate-pulse">
            <div className="h-8 bg-muted/30 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-muted/30 rounded w-1/2"></div>
          </div>
        </div>
        <Footer />
        <MobileBottomNav />
      </div>
    }>
      <ExplorePageContent />
    </Suspense>
  );
}
