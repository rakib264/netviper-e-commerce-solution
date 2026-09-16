"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import ProductCardRegular from "@/components/ui/product-card-regular";
import ProductCardDiscounted from "@/components/ui/product-card-discounted";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useDebounce } from "@/hooks/use-debounce";
import { addToCart } from "@/lib/store/slices/cartSlice";
import {
  addToWishlist,
  removeFromWishlist,
} from "@/lib/store/slices/wishlistSlice";
import { RootState } from "@/lib/store/store";
import { formatEuroCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Crown,
  Flame,
  Grid,
  Heart,
  List,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from '@/components/providers/LocalizationProvider';

const sortOptions = [
  { value: "stock", labelKey: 'common.sort.lowestStockFirst' },
  { value: "newest", labelKey: 'common.sort.newestFirst' },
  { value: "price-asc", labelKey: 'common.sort.priceLowToHigh' },
  { value: "price-desc", labelKey: 'common.sort.priceHighToLow' },
  { value: "rating", labelKey: 'common.sort.highestRated' },
  { value: "name", labelKey: 'common.sort.nameAZ' },
];

/**
 * Anything the server already resolved. `undefined` means this component was
 * rendered outside its server shell and must fetch for itself.
 */
export interface ProductRailClientProps {
  initialProducts?: any[];
  initialTotal?: number;
  initialPages?: number;
  initialCategories?: { name: string; slug: string }[];
}

export default function LimitedEditionPageClient({
  initialProducts,
  initialTotal,
  initialPages,
  initialCategories,
}: ProductRailClientProps = {}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  const [products, setProducts] = useState<any[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(!initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isManuallyClearing, setIsManuallyClearing] = useState(false);
  const [sortBy, setSortBy] = useState("stock");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: initialTotal ?? 0,
    pages: initialPages ?? 0,
  });

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>(
    initialCategories ?? [],
  );
  const [categorySlug, setCategorySlug] = useState<string>("");

  // Debounce the search query for optimal performance
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);

  // `null` from the server means "not supplied, go fetch"; a supplied list —
  // even an empty one — is a resolved answer and must not trigger a fetch.
  useEffect(() => {
    if (!initialCategories) loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync debounced search with local state
  useEffect(() => {
    if (!isManuallyClearing && debouncedSearchQuery !== searchQuery) {
      setSearchQuery(debouncedSearchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearchQuery, searchQuery, isManuallyClearing]);

  // Initialize local search
  useEffect(() => {
    if (searchQuery !== localSearchQuery && localSearchQuery === "") {
      setLocalSearchQuery(searchQuery);
    }
  }, [searchQuery, localSearchQuery]);

  // The server already resolved the first, unfiltered page, so the mount-time
  // run is skipped when it supplied one. Every later run — a filter, a sort, a
  // page change — fetches normally.
  const skipFirstFetch = useRef(Boolean(initialProducts));
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchQuery,
    sortBy,
    pagination.page,
    priceRange,
    minRating,
    selectedColors,
    categorySlug,
  ]);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("isLimitedEdition", "true");
        params.set("page", String(pagination.page));
        params.set("limit", String(pagination.limit));
        // Always set search parameter, even if empty to ensure proper clearing
        params.set("search", searchQuery || "");
        if (categorySlug) params.set("category", categorySlug);
        if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]));
        if (priceRange[1] < 50000)
          params.set("maxPrice", String(priceRange[1]));
        if (minRating > 0) params.set("minRating", String(minRating));
        if (selectedColors.length > 0)
          params.set("color", selectedColors.join(","));

        // Handle sorting
        switch (sortBy) {
          case "stock":
            params.set("sortBy", "quantity");
            params.set("sortOrder", "asc");
            break;
          case "price-asc":
            params.set("sortBy", "price");
            params.set("sortOrder", "asc");
            break;
          case "price-desc":
            params.set("sortBy", "price");
            params.set("sortOrder", "desc");
            break;
          case "rating":
            params.set("sortBy", "averageRating");
            params.set("sortOrder", "desc");
            break;
          case "name":
            params.set("sortBy", "name");
            params.set("sortOrder", "asc");
            break;
          default:
            params.set("sortBy", "quantity");
            params.set("sortOrder", "asc");
        }

        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (res.ok) {
          setProducts(data.products || []);

          // Update pagination from API response (similar to categories page)
          if (data.pagination) {
            setPagination((prev) => ({
              ...prev,
              total: data.pagination.total || 0,
              pages: data.pagination.pages || 0,
            }));
          } else {
            // Fallback to direct properties if pagination object doesn't exist
            setPagination((prev) => ({
              ...prev,
              total: data.total || 0,
              pages: Math.ceil((data.total || 0) / prev.limit),
            }));
          }
        }
      } catch (e) {
        if ((e as any).name !== "AbortError") {
          console.error("Error fetching limited edition products:", e);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  };

  const clearFilters = () => {
    setSearchQuery("");
    setLocalSearchQuery("");
    setCategorySlug("");
    setSelectedColors([]);
    setPriceRange([0, 50000]);
    setMinRating(0);
    setSortBy("stock");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const onSearchChange = (value: string) => {
    setLocalSearchQuery(value);
  };

  const clearSearch = () => {
    setIsManuallyClearing(true);
    setLocalSearchQuery("");
    setSearchQuery("");
    setPagination((prev) => ({ ...prev, page: 1 }));

    setTimeout(() => {
      setIsManuallyClearing(false);
    }, 600);
  };

  const handleAddToCart = (product: any) => {
    dispatch(
      addToCart({
        id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.thumbnailImage,
        maxQuantity: product.quantity ?? 99,
      })
    );
  };

  const handleWishlistToggle = (product: any) => {
    const isInWishlist = wishlistItems.some((item) => item.id === product._id);

    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
    } else {
      dispatch(
        addToWishlist({
          id: product._id,
          name: product.name,
          price: product.price,
          image: product.thumbnailImage,
          comparePrice: product.comparePrice,
          inStock: (product.quantity ?? 0) > 0,
        })
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatPrice = (price: number) => {
    return formatEuroCurrency(price);
  };

  const hasActiveFilters =
    searchQuery ||
    categorySlug ||
    minRating > 0 ||
    selectedColors.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 via-secondary-800 to-primary-900 text-beige-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-40 h-40 bg-card rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-secondary-300 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-warning-300 rounded-full blur-3xl"></div>
      </div>

      <Header />

      <div className="container mx-auto px-4 py-4 md:py-8 mt-16 md:mt-20 mb-20 md:mb-0 relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Crown className="text-warning-400" size={32} />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sandy via-beige-200 to-primary-200 bg-clip-text text-transparent">
              {t('products.limitedEdition.limitedEdition')}
            </h1>
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Flame className="text-warning-400" size={32} />
            </motion.div>
          </div>
          <p className="text-primary-100 text-center mb-6">
            {t('products.limitedEdition.exclusivePiecesInLimitedQuantitiesDon')}
          </p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary px-6 py-3 rounded-full shadow-lg">
              <Timer size={16} />
              <span className="text-sm font-medium">{t('products.limitedEdition.limitedTimeOnly')}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Search and Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Enhanced Search with Clear Icon */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-destructive-400"
                size={20}
              />
              <Input
                placeholder={t('products.limitedEdition.searchLimitedEditionProducts')}
                value={localSearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10 h-12 bg-card/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-300 transition-all duration-200 focus:border-white/40 focus:ring-1 focus:ring-white/40"
              />
              {localSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-card/10 rounded-full transition-all duration-200"
                >
                  <X size={16} className="text-gray-300 hover:text-white" />
                </Button>
              )}
              {loading && localSearchQuery && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48 h-12 bg-card/10 backdrop-blur-sm border-white/20 text-white">
                <SelectValue placeholder={t('products.limitedEdition.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode - Desktop Only */}
            <div className="hidden lg:flex border border-white/20 rounded-lg p-1 bg-card/10 backdrop-blur-sm">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="px-4 py-2 text-white transition-all duration-200 hover:bg-card/20"
              >
                <Grid size={16} className="mr-2" />
                {t('products.limitedEdition.grid')}
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-4 py-2 text-white transition-all duration-200 hover:bg-card/20"
              >
                <List size={16} className="mr-2" />
                {t('products.limitedEdition.list')}
              </Button>
            </div>

            {/* Filter Toggle - Desktop */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="hidden lg:flex h-12 px-4 bg-card/10 backdrop-blur-sm border-white/20 text-white hover:bg-card/20 transition-all duration-200 font-medium"
            >
              <SlidersHorizontal size={16} className="mr-2" />
              {t('products.limitedEdition.filters')}
              <ChevronDown
                size={16}
                className={`ml-2 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>

          {/* Mobile Action Bar */}
          <div className="flex lg:hidden gap-3">
            {/* Filter Button - 50% width */}
            <div className="flex-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 bg-card/10 backdrop-blur-sm border-white/20 text-white hover:bg-card/20 transition-all duration-200 font-medium"
                  >
                    <SlidersHorizontal size={18} className="mr-2" />
                    {t('products.limitedEdition.filters')}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0 bg-card">
                  <SheetHeader className="p-6 pb-0 text-left">
                    <SheetTitle className="text-left text-xl font-semibold text-foreground">
                      {t('products.limitedEdition.filters')}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-6">
                    <MobileFilterContent
                      categories={categories}
                      categorySlug={categorySlug}
                      setCategorySlug={setCategorySlug}
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      formatPrice={formatPrice}
                      selectedColors={selectedColors}
                      toggleColor={toggleColor}
                      minRating={minRating}
                      setMinRating={setMinRating}
                      clearFilters={clearFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* View Mode Toggle - 50% width */}
            <div className="flex-1">
              <div className="flex h-12 border border-white/20 rounded-lg p-1 bg-card/10 backdrop-blur-sm">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`flex-1 h-full transition-all duration-200 ${
                    viewMode === "grid"
                      ? "bg-card text-foreground shadow-sm"
                      : "hover:bg-card/20 text-white"
                  }`}
                >
                  <Grid size={16} className="mr-1" />
                  {t('products.limitedEdition.grid')}
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`flex-1 h-full transition-all duration-200 ${
                    viewMode === "list"
                      ? "bg-card text-foreground shadow-sm"
                      : "hover:bg-card/20 text-white"
                  }`}
                >
                  <List size={16} className="mr-1" />
                  {t('products.limitedEdition.list')}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex gap-8">
          {/* Desktop Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-80 space-y-6"
              >
                <div className="bg-card/10 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-white/20">
                  <DesktopFilterContent
                    categories={categories}
                    categorySlug={categorySlug}
                    setCategorySlug={setCategorySlug}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    formatPrice={formatPrice}
                    selectedColors={selectedColors}
                    toggleColor={toggleColor}
                    minRating={minRating}
                    setMinRating={setMinRating}
                    clearFilters={clearFilters}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Products Grid/List */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-primary-100">
                {t('common.showingOfItems', { shown: products.length, total: pagination.total, items: t('products.limitedEdition.limitedEditionProducts') })}
              </p>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary-200">
                    {t('products.limitedEdition.activeFilters')}
                  </span>
                  {searchQuery && (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-card/20 text-white border-white/30"
                    >
                      "{searchQuery}"
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={clearSearch}
                      />
                    </Badge>
                  )}
                  {categorySlug !== "" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-card/20 text-white border-white/30"
                    >
                      {categories.find((c) => c.slug === categorySlug)?.name ||
                        categorySlug}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setCategorySlug("")}
                      />
                    </Badge>
                  )}
                  {selectedColors.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="gap-1 bg-card/20 text-white border-white/30"
                    >
                      {c}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => toggleColor(c)}
                      />
                    </Badge>
                  ))}
                  {minRating > 0 && (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-card/20 text-white border-white/30"
                    >
                      {minRating}{t('products.limitedEdition.stars')}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setMinRating(0)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <motion.div
              layout
              className={`${
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12"
                  : "grid grid-cols-1 gap-6"
              }`}
            >
              <AnimatePresence>
                {loading
                  ? [...Array(12)].map((_, index) => (
                      <div
                        key={index}
                        className="animate-pulse bg-card/20 h-80 rounded-lg"
                      />
                    ))
                  : products.map((product: any, index: number) => {
                      const hasDiscount = product.comparePrice &&
                        product.comparePrice > 0 &&
                        product.comparePrice > product.price;

                      return (
                        <motion.div
                          key={product._id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          {viewMode === "grid" ? (
                            hasDiscount ? (
                              <ProductCardDiscounted
                                product={{
                                  _id: product._id,
                                  name: product.name,
                                  slug: product.slug,
                                  price: product.price,
                                  comparePrice: product.comparePrice,
                                  thumbnailImage: product.thumbnailImage,
                                  averageRating: product.averageRating,
                                  totalReviews: product.totalReviews,
                                  quantity: product.quantity,
                                  category: product.category
                                }}
                                className="h-full"
                              />
                            ) : (
                              <ProductCardRegular
                                product={{
                                  _id: product._id,
                                  name: product.name,
                                  slug: product.slug,
                                  price: product.price,
                                  comparePrice: product.comparePrice,
                                  thumbnailImage: product.thumbnailImage,
                                  averageRating: product.averageRating,
                                  totalReviews: product.totalReviews,
                                  quantity: product.quantity,
                                  category: product.category
                                }}
                                className="h-full"
                              />
                            )
                          ) : (
                            // List View - Keep existing list view design
                            <Card className="group border-0 bg-transparent shadow-none">
                              <Link href={`/products/${product.slug}`}>
                                <div className="flex gap-4 bg-card/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-white/20">
                                  <div className="relative w-48 h-48 flex-shrink-0 bg-card/5">
                                    <img
                                      src={product.thumbnailImage}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>

                                  <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div>
                                      <p className="text-sm text-gray-300 font-medium uppercase tracking-wide mb-2">
                                        {product.category?.name ||
                                          t('products.limitedEdition.limitedEdition')}
                                      </p>

                                      <h3 className="text-xl font-medium mb-3 text-black">
                                        {product.name}
                                      </h3>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-2xl font-price font-semibold text-black">
                                          {formatPrice(product.price)}
                                        </span>
                                        {product?.comparePrice !== 0 &&
                                          product?.comparePrice !== undefined &&
                                          product?.comparePrice >
                                            product?.price && (
                                            <span className="text-lg font-caption text-gray-300 line-through">
                                              {formatPrice(product.comparePrice)}
                                            </span>
                                          )}
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="p-2 border-white/20 text-white hover:bg-card/10"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleWishlistToggle(product);
                                          }}
                                        >
                                          <Heart
                                            size={18}
                                            className={
                                              wishlistItems.some(
                                                (item) => item.id === product._id
                                              )
                                                ? "fill-current text-destructive-500"
                                                : ""
                                            }
                                          />
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleAddToCart(product);
                                          }}
                                          className="px-6 bg-gradient-to-r from-primary to-secondary hover:from-primary-700 hover:to-secondary-700"
                                        >
                                          <ShoppingBag
                                            size={16}
                                            className="mr-2"
                                          />
                                          {t('products.limitedEdition.addToCart')}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </Card>
                          )}
                        </motion.div>
                      );
                    })}
              </AnimatePresence>
            </motion.div>

            {!loading && products.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Crown size={64} className="mx-auto text-primary-300 mb-4" />
                <h3 className="text-xl font-semibold text-primary-100 mb-2">
                  {t('products.limitedEdition.noLimitedEditionItemsFound')}
                </h3>
                <p className="text-primary-200 mb-4">
                  {t('products.limitedEdition.tryAdjustingYourSearchCriteriaOr')}
                </p>
                <Button
                  onClick={clearFilters}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {t('products.limitedEdition.clearAllFilters')}
                </Button>
              </motion.div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12"
              >
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  onPageChange={handlePageChange}
                  isLoading={loading}
                  className="mb-6"
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-primary-100 text-sm">
              {t('common.showingOfItems', { shown: products.length, total: pagination.total, items: t('products.limitedEdition.limitedEditionProducts') })}
            </p>
          </div>

          {/* Mobile Active Filters */}
          {hasActiveFilters && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-primary-200">{t('products.limitedEdition.filters2')}</span>
                {searchQuery && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-card/20 text-white border-white/30"
                  >
                    "{searchQuery}"
                    <X
                      size={12}
                      className="cursor-pointer"
                      onClick={clearSearch}
                    />
                  </Badge>
                )}
                {categorySlug !== "" && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-card/20 text-white border-white/30"
                  >
                    {categories.find((c) => c.slug === categorySlug)?.name ||
                      categorySlug}
                    <X
                      size={12}
                      className="cursor-pointer"
                      onClick={() => setCategorySlug("")}
                    />
                  </Badge>
                )}
                {selectedColors.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="gap-1 bg-card/20 text-white border-white/30"
                  >
                    {c}
                    <X
                      size={12}
                      className="cursor-pointer"
                      onClick={() => toggleColor(c)}
                    />
                  </Badge>
                ))}
                {minRating > 0 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-card/20 text-white border-white/30"
                  >
                    {minRating}{t('products.limitedEdition.stars')}
                    <X
                      size={12}
                      className="cursor-pointer"
                      onClick={() => setMinRating(0)}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Mobile Products Grid */}
          <motion.div
            layout
            className={`${
              viewMode === "grid"
                ? "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4"
                : "grid grid-cols-1 gap-4"
            }`}
          >
            <AnimatePresence>
              {loading
                ? [...Array(12)].map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse bg-card/20 h-80 rounded-lg"
                    />
                  ))
                : products.map((product: any, index: number) => {
                    const hasDiscount = product.comparePrice &&
                      product.comparePrice > 0 &&
                      product.comparePrice > product.price;

                    return (
                      <motion.div
                        key={product._id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        {viewMode === "grid" ? (
                          hasDiscount ? (
                            <ProductCardDiscounted
                              product={{
                                _id: product._id,
                                name: product.name,
                                slug: product.slug,
                                price: product.price,
                                comparePrice: product.comparePrice,
                                thumbnailImage: product.thumbnailImage,
                                averageRating: product.averageRating,
                                totalReviews: product.totalReviews,
                                quantity: product.quantity,
                                category: product.category
                              }}
                              className="h-full"
                            />
                          ) : (
                            <ProductCardRegular
                              product={{
                                _id: product._id,
                                name: product.name,
                                slug: product.slug,
                                price: product.price,
                                comparePrice: product.comparePrice,
                                thumbnailImage: product.thumbnailImage,
                                averageRating: product.averageRating,
                                totalReviews: product.totalReviews,
                                quantity: product.quantity,
                                category: product.category
                              }}
                              className="h-full"
                            />
                          )
                        ) : (
                          // Mobile List View - Keep existing list view design
                          <Card className="group border-0 bg-transparent shadow-none">
                            <Link href={`/products/${product.slug}`}>
                              <div className="flex gap-3 bg-card/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-sm border border-white/20">
                                <div className="relative w-28 h-28 flex-shrink-0 bg-card/5">
                                  <img
                                    src={product.thumbnailImage}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="flex-1 py-2 pr-2 flex flex-col justify-between">
                                  <div>
                                    <p className="text-xs text-gray-300 font-medium uppercase tracking-wide mb-1">
                                      {product.category?.name ||
                                        t('products.limitedEdition.limitedEdition')}
                                    </p>

                                    <h3 className="text-sm font-medium mb-2 line-clamp-2 text-black">
                                      {product.name}
                                    </h3>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-price font-semibold text-black">
                                        {formatPrice(product.price)}
                                      </span>
                                      {product?.comparePrice !== 0 &&
                                        product?.comparePrice !== undefined &&
                                        product?.comparePrice >
                                          product?.price && (
                                          <span className="text-xs font-caption text-gray-300 line-through">
                                            {formatPrice(product.comparePrice)}
                                          </span>
                                        )}
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleWishlistToggle(product);
                                      }}
                                      className="p-1.5"
                                    >
                                      <Heart
                                        size={16}
                                        className={
                                          wishlistItems.some(
                                            (item) => item.id === product._id
                                          )
                                            ? "fill-current text-destructive-500"
                                            : "text-white"
                                        }
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </Card>
                        )}
                      </motion.div>
                    );
                  })}
            </AnimatePresence>
          </motion.div>

          {!loading && products.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Crown size={48} className="mx-auto text-primary-300 mb-4" />
              <h3 className="text-lg font-semibold text-primary-100 mb-2">
                {t('products.limitedEdition.noLimitedEditionItemsFound')}
              </h3>
              <p className="text-primary-200 text-sm mb-4">
                {t('products.limitedEdition.tryAdjustingYourSearchOrFilters')}
              </p>
              <Button
                onClick={clearFilters}
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {t('products.limitedEdition.clearAllFilters')}
              </Button>
            </motion.div>
          )}

          {/* Mobile Pagination */}
          {pagination.pages > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={handlePageChange}
                isLoading={loading}
                className="mb-6"
              />
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

// Filter Components (using same structure but adapted for Limited Edition theme)
const MobileFilterContent = ({
  categories,
  categorySlug,
  setCategorySlug,
  priceRange,
  setPriceRange,
  formatPrice,
  selectedColors,
  toggleColor,
  minRating,
  setMinRating,
  clearFilters,
}: any) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">{t('products.limitedEdition.filters')}</h3>
      <Button variant="ghost" size="sm" onClick={clearFilters}>
        {t('products.limitedEdition.clearAll')}
      </Button>
    </div>

    {/* Category Filter */}
    <div className="space-y-3">
      <h4 className="font-medium">{t('products.limitedEdition.category')}</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mobile-all"
            checked={categorySlug === ""}
            onCheckedChange={() => setCategorySlug("")}
          />
          <label htmlFor="mobile-all" className="text-sm cursor-pointer">
            {t('products.limitedEdition.all')}
          </label>
        </div>
        {categories.map((category: any) => (
          <div key={category.slug} className="flex items-center space-x-2">
            <Checkbox
              id={`mobile-${category.slug}`}
              checked={categorySlug === category.slug}
              onCheckedChange={() => setCategorySlug(category.slug)}
            />
            <label
              htmlFor={`mobile-${category.slug}`}
              className="text-sm cursor-pointer"
            >
              {category.name}
            </label>
          </div>
        ))}
      </div>
    </div>

    {/* Price Range */}
    <div className="space-y-3">
      <h4 className="font-medium">{t('products.limitedEdition.priceRange')}</h4>
      <Slider
        value={priceRange}
        onValueChange={(value) =>
          setPriceRange([value[0] ?? 0, value[1] ?? 50000])
        }
        max={50000}
        step={1000}
        className="py-4"
      />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{formatPrice(priceRange[0])}</span>
        <span>{formatPrice(priceRange[1])}</span>
      </div>
    </div>

    {/* Color Filter */}
    <div className="space-y-3">
      <h4 className="font-medium">{t('products.limitedEdition.color')}</h4>
      <div className="grid grid-cols-2 gap-2">
        {[
          "Black",
          "White",
          "Blue",
          "Red",
          "Green",
          "Yellow",
          "Gray",
          "Pink",
          "Purple",
        ].map((color) => (
          <div key={color} className="flex items-center space-x-2">
            <Checkbox
              id={`mobile-color-${color}`}
              checked={selectedColors.includes(color)}
              onCheckedChange={() => toggleColor(color)}
            />
            <label
              htmlFor={`mobile-color-${color}`}
              className="text-sm cursor-pointer"
            >
              {color}
            </label>
          </div>
        ))}
      </div>
    </div>

    {/* Rating Filter */}
    <div className="space-y-3">
      <h4 className="font-medium">{t('products.limitedEdition.minimumRating')}</h4>
      <div className="space-y-2">
        {[4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center space-x-2">
            <Checkbox
              id={`mobile-rating-${rating}`}
              checked={minRating === rating}
              onCheckedChange={() =>
                setMinRating(minRating === rating ? 0 : rating)
              }
            />
            <label
              htmlFor={`mobile-rating-${rating}`}
              className="flex items-center space-x-1 text-sm cursor-pointer"
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < rating
                        ? "text-warning-400 fill-current"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span>{t('products.limitedEdition.up')}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  </div>
);
};

const DesktopFilterContent = ({
  categories,
  categorySlug,
  setCategorySlug,
  priceRange,
  setPriceRange,
  formatPrice,
  selectedColors,
  toggleColor,
  minRating,
  setMinRating,
  clearFilters,
}: any) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-6 text-white">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold">{t('products.limitedEdition.filters')}</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={clearFilters}
        className="text-white hover:bg-card/10"
      >
        {t('products.limitedEdition.clearAll')}
      </Button>
    </div>

    {/* Category Filter */}
    <div className="space-y-3 mb-6">
      <h4 className="font-medium">{t('products.limitedEdition.category')}</h4>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="desktop-all"
            checked={categorySlug === ""}
            onCheckedChange={() => setCategorySlug("")}
          />
          <label htmlFor="desktop-all" className="text-sm cursor-pointer">
            {t('products.limitedEdition.all')}
          </label>
        </div>
        {categories.map((category: any) => (
          <div key={category.slug} className="flex items-center space-x-2">
            <Checkbox
              id={`desktop-${category.slug}`}
              checked={categorySlug === category.slug}
              onCheckedChange={() => setCategorySlug(category.slug)}
            />
            <label
              htmlFor={`desktop-${category.slug}`}
              className="text-sm cursor-pointer"
            >
              {category.name}
            </label>
          </div>
        ))}
      </div>
    </div>

    {/* Price Range */}
    <div className="space-y-3 mb-6">
      <h4 className="font-medium">{t('products.limitedEdition.priceRange')}</h4>
      <Slider
        value={priceRange}
        onValueChange={(value) =>
          setPriceRange([value[0] ?? 0, value[1] ?? 50000])
        }
        max={50000}
        step={1000}
        className="py-4"
      />
      <div className="flex items-center justify-between text-sm text-gray-300">
        <span>{formatPrice(priceRange[0])}</span>
        <span>{formatPrice(priceRange[1])}</span>
      </div>
    </div>

    {/* Color Filter */}
    <div className="space-y-3 mb-6">
      <h4 className="font-medium">{t('products.limitedEdition.color')}</h4>
      <div className="grid grid-cols-3 gap-2">
        {[
          "Black",
          "White",
          "Blue",
          "Red",
          "Green",
          "Yellow",
          "Gray",
          "Pink",
          "Purple",
        ].map((color) => (
          <div key={color} className="flex items-center space-x-2">
            <Checkbox
              id={`desktop-color-${color}`}
              checked={selectedColors.includes(color)}
              onCheckedChange={() => toggleColor(color)}
            />
            <label
              htmlFor={`desktop-color-${color}`}
              className="text-sm cursor-pointer"
            >
              {color}
            </label>
          </div>
        ))}
      </div>
    </div>

    {/* Rating Filter */}
    <div className="space-y-3">
      <h4 className="font-medium">{t('products.limitedEdition.minimumRating')}</h4>
      <div className="space-y-2">
        {[4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center space-x-2">
            <Checkbox
              id={`desktop-rating-${rating}`}
              checked={minRating === rating}
              onCheckedChange={() =>
                setMinRating(minRating === rating ? 0 : rating)
              }
            />
            <label
              htmlFor={`desktop-rating-${rating}`}
              className="flex items-center space-x-1 text-sm cursor-pointer"
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < rating
                        ? "text-warning-400 fill-current"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span>{t('products.limitedEdition.up')}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  </div>
);
};
