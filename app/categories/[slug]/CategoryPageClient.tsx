'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import AddToCartButton from '@/components/ui/add-to-cart-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import ProductCardRegular, {
  type Product,
} from '@/components/ui/product-card-regular';
import {
  ProductGridSkeleton,
  ProductListSkeleton,
} from '@/components/ui/product-card-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useDebounce } from '@/hooks/use-debounce';
import {
  addToWishlist,
  removeFromWishlist,
} from '@/lib/store/slices/wishlistSlice';
import type { RootState } from '@/lib/store/store';
import { cn, formatEuroCurrency } from '@/lib/utils';
import { Heart, LayoutGrid, Rows3, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export interface CategorySummary {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: { _id: string; name: string; slug: string } | null;
}

interface FallbackInfo {
  originalCategory: { name: string; slug: string };
  showingFromSubcategories: { name: string; slug: string }[];
}

interface Facets {
  colors: string[];
  priceRange: { min: number; max: number } | null;
}

type SortMode = 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'name';

const SORT_OPTIONS: { value: SortMode; labelKey: string }[] = [
  { value: 'newest', labelKey: 'common.sort.newest' },
  { value: 'price-asc', labelKey: 'common.sort.priceLowToHigh' },
  { value: 'price-desc', labelKey: 'common.sort.priceHighToLow' },
  { value: 'rating', labelKey: 'common.sort.highestRated' },
  { value: 'name', labelKey: 'common.sort.nameAZ' },
];

const SORT_QUERY: Record<SortMode, { sortBy: string; sortOrder: string }> = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  'price-asc': { sortBy: 'price', sortOrder: 'asc' },
  'price-desc': { sortBy: 'price', sortOrder: 'desc' },
  rating: { sortBy: 'averageRating', sortOrder: 'desc' },
  name: { sortBy: 'name', sortOrder: 'asc' },
};

const PAGE_SIZE = 12;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const NAV_ITEM = 'font-navigation text-xs uppercase tracking-[0.08em]';

/* ------------------------------------------------------------------ pieces */

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <h3 className="luxury-eyebrow">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RatingRow({ value, label }: { value: number; label?: string }) {
  const { t, tPlural } = useTranslation();
  if (label) {
    return <span className="font-paragraph text-sm">{label}</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={13}
            className={
              star <= value ? 'fill-foreground text-foreground' : 'text-border'
            }
          />
        ))}
      </span>
      <span className="font-caption text-xs text-muted-foreground">{t('categories.detail.categoryPageClient.up')}</span>
    </span>
  );
}

interface FilterPanelProps {
  facets: Facets | null;
  /** Facets arrive with the first response; reserve their groups until then. */
  facetsPending: boolean;
  priceBounds: { min: number; max: number } | null;
  priceRange: [number, number] | null;
  onPriceChange: (range: [number, number]) => void;
  minRating: number;
  onRatingChange: (rating: number) => void;
  colors: string[];
  onToggleColor: (color: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

function FilterPanel({
  facets,
  facetsPending,
  priceBounds,
  priceRange,
  onPriceChange,
  minRating,
  onRatingChange,
  colors,
  onToggleColor,
  onClear,
  hasActiveFilters,
}: FilterPanelProps) {
  const { t } = useTranslation();
  const sliderValue: [number, number] = priceRange ??
    (priceBounds ? [priceBounds.min, priceBounds.max] : [0, 0]);

  return (
    <div>
      {facetsPending ? (
        <FilterGroup title={t('categories.detail.categoryPageClient.price')}>
          <div className="animate-pulse">
            <div className="h-2 w-full rounded-full bg-border" />
            <div className="mt-4 flex items-center justify-between">
              <div className="h-3 w-12 rounded-sm bg-border" />
              <div className="h-3 w-12 rounded-sm bg-border" />
            </div>
          </div>
        </FilterGroup>
      ) : priceBounds && priceBounds.max > priceBounds.min ? (
        <FilterGroup title={t('categories.detail.categoryPageClient.price')}>
          <Slider
            value={sliderValue}
            onValueChange={(next) => onPriceChange([next[0], next[1]] as [number, number])}
            min={priceBounds.min}
            max={priceBounds.max}
            step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 100))}
            aria-label={t('categories.detail.categoryPageClient.priceRange')}
          />
          <div className="mt-4 flex items-center justify-between font-price text-xs text-foreground">
            <span>{formatEuroCurrency(sliderValue[0])}</span>
            <span>{formatEuroCurrency(sliderValue[1])}</span>
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup title={t('categories.detail.categoryPageClient.rating')}>
        <div className="space-y-1">
          {[0, 4, 3, 2, 1].map((rating) => {
            const isActive = minRating === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => onRatingChange(rating)}
                aria-pressed={isActive}
                className={cn(
                  'flex w-full items-center rounded-sm px-2 py-2 text-left transition-colors duration-200',
                  FOCUS_RING,
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <RatingRow
                  value={rating}
                  label={rating === 0 ? t('categories.detail.categoryPageClient.anyRating') : undefined}
                />
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {facetsPending ? (
        <FilterGroup title={t('categories.detail.categoryPageClient.colour')}>
          <div className="animate-pulse space-y-3">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-none bg-border" />
                <div className="h-3 w-24 rounded-sm bg-border" />
              </div>
            ))}
          </div>
        </FilterGroup>
      ) : facets && facets.colors.length > 0 ? (
        <FilterGroup title={t('categories.detail.categoryPageClient.colour')}>
          <div className="space-y-3">
            {facets.colors.map((color) => {
              const id = `colour-${color.replace(/\W+/g, '-').toLowerCase()}`;
              return (
                <div key={color} className="flex items-center gap-3">
                  <Checkbox
                    id={id}
                    checked={colors.includes(color)}
                    onCheckedChange={() => onToggleColor(color)}
                    className="rounded-none border-border data-[state=checked]:border-foreground data-[state=checked]:bg-foreground"
                  />
                  <label
                    htmlFor={id}
                    className="cursor-pointer font-paragraph text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {color}
                  </label>
                </div>
              );
            })}
          </div>
        </FilterGroup>
      ) : null}

      {hasActiveFilters && (
        <div className="border-t border-border pt-6">
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'rounded-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground',
              NAV_ITEM,
              FOCUS_RING,
            )}
          >
            {t('categories.detail.categoryPageClient.clearAllFilters')}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        'inline-flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-muted-foreground transition-colors duration-200 hover:border-foreground hover:text-foreground',
        NAV_ITEM,
        FOCUS_RING,
      )}
    >
      {label}
      <X size={12} aria-hidden />
      <span className="sr-only">{t('categories.detail.categoryPageClient.removeFilter')}</span>
    </button>
  );
}

/** Horizontal card used by the list view; mirrors `ProductRowSkeleton`. */
function ProductRow({ product }: { product: Product }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  const inWishlist = wishlistItems.some((item) => item.id === product._id);

  const hasDiscount =
    typeof product.comparePrice === 'number' && product.comparePrice > product.price;
  const isOutOfStock = product.quantity !== undefined && product.quantity <= 0;

  const toggleWishlist = () => {
    if (inWishlist) {
      dispatch(removeFromWishlist(product._id));
      return;
    }
    dispatch(
      addToWishlist({
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.thumbnailImage,
        comparePrice: product.comparePrice,
        inStock: !isOutOfStock,
      }),
    );
  };

  return (
    <article className="group flex gap-5 border-b border-border pb-6">
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          'relative h-32 w-28 shrink-0 overflow-hidden bg-muted sm:h-40 sm:w-36',
          FOCUS_RING,
        )}
        aria-label={product.name}
      >
        <Image
          src={product.thumbnailImage || '/placeholder-product.jpg'}
          alt={product.name}
          fill
          sizes="144px"
          className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        {product.category && (
          <p className="luxury-eyebrow">{product.category.name}</p>
        )}

        <Link
          href={`/products/${product.slug}`}
          className={cn(
            'mt-1 rounded-sm font-title text-base leading-snug text-foreground transition-colors hover:text-muted-foreground',
            FOCUS_RING,
          )}
        >
          {product.name}
        </Link>

        {(product.averageRating ?? 0) > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="flex" aria-hidden>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  className={
                    star <= Math.round(product.averageRating || 0)
                      ? 'fill-foreground text-foreground'
                      : 'text-border'
                  }
                />
              ))}
            </span>
            <span className="font-caption text-xs text-muted-foreground">
              {product.totalReviews || 0}
            </span>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
          <div className="flex items-baseline gap-2">
            <span className="font-price text-sm text-foreground">
              {formatEuroCurrency(product.price)}
            </span>
            {hasDiscount && (
              <span className="font-caption text-xs text-subtle-foreground line-through">
                {formatEuroCurrency(product.comparePrice as number)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label={inWishlist ? t('categories.detail.categoryPageClient.removeFromWishlist') : t('categories.detail.categoryPageClient.addToWishlist')}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-none border border-border text-foreground transition-colors hover:bg-muted',
                FOCUS_RING,
              )}
            >
              <Heart
                size={16}
                className={inWishlist ? 'fill-foreground text-foreground' : ''}
              />
            </button>

            <AddToCartButton
              productId={product._id}
              productName={product.name}
              productPrice={product.price}
              productImage={product.thumbnailImage}
              productSlug={product.slug}
              availableStock={product.quantity}
              isOutOfStock={isOutOfStock}
              text={t('categories.detail.categoryPageClient.addToBag')}
              size="md"
              className="h-10 rounded-none px-6 text-xs uppercase tracking-[0.08em] shadow-none"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------- page */

export default function CategoryPageClient({
  category,
  subcategories,
}: {
  category: CategorySummary;
  subcategories: CategorySummary[];
}) {
  const { t, tPlural } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState<FallbackInfo | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [minRating, setMinRating] = useState(0);
  const [colors, setColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 400);
  const debouncedPrice = useDebounce(priceRange, 300);

  // Facets are captured from the first response and then held steady: options
  // that vanish as you filter make a filter panel impossible to use, and a
  // price slider whose bounds move under the handle is worse still.
  const facetsLoaded = useRef(false);
  const requestId = useRef(0);
  const resultsTop = useRef<HTMLDivElement>(null);

  const priceBounds = facets?.priceRange ?? null;

  const isPriceFiltered =
    debouncedPrice !== null &&
    priceBounds !== null &&
    (debouncedPrice[0] > priceBounds.min || debouncedPrice[1] < priceBounds.max);

  const hasActiveFilters =
    debouncedSearch !== '' || minRating > 0 || colors.length > 0 || isPriceFiltered;

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    colors.length +
    (isPriceFiltered ? 1 : 0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('category', category.slug);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (minRating > 0) params.set('minRating', String(minRating));
    if (colors.length > 0) params.set('color', colors.join(','));
    if (isPriceFiltered && debouncedPrice) {
      params.set('minPrice', String(debouncedPrice[0]));
      params.set('maxPrice', String(debouncedPrice[1]));
    }

    params.set('sortBy', SORT_QUERY[sortMode].sortBy);
    params.set('sortOrder', SORT_QUERY[sortMode].sortOrder);

    return params.toString();
  }, [
    category.slug,
    page,
    debouncedSearch,
    minRating,
    colors,
    isPriceFiltered,
    debouncedPrice,
    sortMode,
  ]);

  // Any filter change invalidates the page number. Declared before the fetch so
  // the reset lands in the same commit the stale request is aborted in.
  const filterSignature = `${debouncedSearch}|${sortMode}|${minRating}|${colors.join(
    ',',
  )}|${isPriceFiltered && debouncedPrice ? debouncedPrice.join('-') : ''}`;

  useEffect(() => {
    setPage(1);
  }, [filterSignature]);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    setLoading(true);

    const run = async () => {
      try {
        const url = `/api/products?${queryString}${
          facetsLoaded.current ? '' : '&facets=true'
        }`;
        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (id !== requestId.current) return;

        setProducts(data.products || []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.pages ?? 0);
        setIsFallback(Boolean(data.isFallback));
        setFallbackInfo(data.fallbackInfo ?? null);

        if (!facetsLoaded.current && data.facets) {
          facetsLoaded.current = true;
          setFacets(data.facets);
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        if (id !== requestId.current) return;
        console.error('Error fetching category products:', error);
        setProducts([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [queryString]);

  const toggleColor = useCallback((color: string) => {
    setColors((current) =>
      current.includes(color)
        ? current.filter((entry) => entry !== color)
        : [...current, color],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setMinRating(0);
    setColors([]);
    setPriceRange(null);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setPage(nextPage);
    resultsTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const filterPanel = (
    <FilterPanel
      facets={facets}
      facetsPending={facets === null}
      priceBounds={priceBounds}
      priceRange={priceRange}
      onPriceChange={setPriceRange}
      minRating={minRating}
      onRatingChange={setMinRating}
      colors={colors}
      onToggleColor={toggleColor}
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
    />
  );

  return (
    <div className="min-h-screen bg-background font-paragraph">
      <Header />

      <main className="luxury-container mb-20 pb-16 pt-8 md:pt-12 lg:mb-0">
        {/* Breadcrumb */}
        <nav aria-label={t('categories.detail.categoryPageClient.breadcrumb')} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/" className={cn('text-muted-foreground hover:text-foreground', NAV_ITEM, FOCUS_RING)}>
            {t('categories.detail.categoryPageClient.home')}
          </Link>
          <span className="text-border" aria-hidden>/</span>
          <Link href="/categories" className={cn('text-muted-foreground hover:text-foreground', NAV_ITEM, FOCUS_RING)}>
            {t('categories.detail.categoryPageClient.categories')}
          </Link>
          {category.parent && (
            <>
              <span className="text-border" aria-hidden>/</span>
              <Link
                href={`/categories/${category.parent.slug}`}
                className={cn('text-muted-foreground hover:text-foreground', NAV_ITEM, FOCUS_RING)}
              >
                {category.parent.name}
              </Link>
            </>
          )}
          <span className="text-border" aria-hidden>/</span>
          <span className={cn('font-semibold text-foreground', NAV_ITEM)} aria-current="page">
            {category.name}
          </span>
        </nav>

        {/* Category header */}
        <header className="mt-8 border-b border-border pb-8">
          {category.parent && <p className="luxury-eyebrow">{category.parent.name}</p>}
          <h1 className="mt-2 font-navigation text-3xl font-semibold text-foreground md:text-4xl lg:text-5xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-4 max-w-2xl font-paragraph text-sm leading-relaxed text-muted-foreground md:text-base">
              {category.description}
            </p>
          )}

          {subcategories.length > 0 && (
            <nav aria-label={t('categories.detail.categoryPageClient.subcategories')} className="mt-7 flex flex-wrap gap-2">
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory._id}
                  href={`/categories/${subcategory.slug}`}
                  className={cn(
                    'rounded-sm border border-border px-4 py-2 text-muted-foreground transition-colors duration-200 hover:border-foreground hover:text-foreground',
                    NAV_ITEM,
                    FOCUS_RING,
                  )}
                >
                  {subcategory.name}
                </Link>
              ))}
            </nav>
          )}

          {isFallback && fallbackInfo && (
            <div className="mt-7 border-l-2 border-border bg-muted/40 py-4 pl-5 pr-4">
              <p className="luxury-eyebrow">{t('categories.detail.categoryPageClient.showingSubcategoryProducts')}</p>
              <p className="mt-2 font-paragraph text-sm leading-relaxed text-muted-foreground">
                {fallbackInfo.originalCategory.name} {t('categories.detail.categoryPageClient.hasNoProductsOfItsOwn')}{' '}
                {fallbackInfo.showingFromSubcategories.map((sub) => sub.name).join(', ')}.
              </p>
            </div>
          )}
        </header>

        <div ref={resultsTop} className="scroll-mt-24 pt-8 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12 xl:gap-16">
          {/* Desktop filter rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
              <p className="luxury-eyebrow">{t('categories.detail.categoryPageClient.filters')}</p>
              <div className="mt-5">{filterPanel}</div>
            </div>
          </aside>

          <div className="min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:max-w-xs sm:flex-1">
                <Search
                  size={16}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground"
                />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={`Search in ${category.name}`}
                  aria-label={`Search in ${category.name}`}
                  className="h-10 rounded-sm border-border pl-9 font-paragraph text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-foreground transition-colors hover:bg-muted lg:hidden',
                        NAV_ITEM,
                        FOCUS_RING,
                      )}
                    >
                      <SlidersHorizontal size={14} aria-hidden />
                      {t('categories.detail.categoryPageClient.filters')}
                      {activeFilterCount > 0 && (
                        <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-foreground px-1 font-caption text-[10px] text-background">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>

                  <SheetContent
                    side="left"
                    className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
                  >
                    <SheetHeader className="border-b border-border p-6 text-left">
                      <SheetTitle className="font-navigation text-sm font-semibold uppercase tracking-[0.1em] text-foreground">
                        {t('categories.detail.categoryPageClient.filters')}
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6">{filterPanel}</div>

                    <div className="border-t border-border p-4">
                      <Button
                        onClick={() => setFiltersOpen(false)}
                        className="h-11 w-full rounded-sm"
                      >
                        {tPlural('categories.detail.categoryPageClient.showResults', total)}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                <Select
                  value={sortMode}
                  onValueChange={(value) => setSortMode(value as SortMode)}
                >
                  <SelectTrigger
                    aria-label={t('categories.detail.categoryPageClient.sortProducts')}
                    className="h-10 w-[170px] rounded-sm border-border font-paragraph text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="hidden items-center gap-1 sm:flex" role="group" aria-label={t('categories.detail.categoryPageClient.viewMode')}>
                  {([
                    { mode: 'grid' as const, Icon: LayoutGrid, label: t('categories.detail.categoryPageClient.gridView') },
                    { mode: 'list' as const, Icon: Rows3, label: t('categories.detail.categoryPageClient.listView') },
                  ]).map(({ mode, Icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-label={label}
                      aria-pressed={viewMode === mode}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-sm border transition-colors duration-200',
                        FOCUS_RING,
                        viewMode === mode
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon size={16} aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result count + applied filters */}
            <div className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
              <p className="font-caption text-xs uppercase tracking-[0.1em] text-muted-foreground" aria-live="polite">
                {loading
                  ? t('categories.detail.categoryPageClient.loadingProducts')
                  : `${total} ${total === 1 ? 'product' : 'products'}`}
              </p>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  {debouncedSearch && (
                    <FilterChip
                      label={`“${debouncedSearch}”`}
                      onRemove={() => setSearchInput('')}
                    />
                  )}
                  {isPriceFiltered && debouncedPrice && (
                    <FilterChip
                      label={`${formatEuroCurrency(debouncedPrice[0])} – ${formatEuroCurrency(debouncedPrice[1])}`}
                      onRemove={() => setPriceRange(null)}
                    />
                  )}
                  {minRating > 0 && (
                    <FilterChip
                      label={t('common.minRatingStars', { rating: minRating })}
                      onRemove={() => setMinRating(0)}
                    />
                  )}
                  {colors.map((color) => (
                    <FilterChip
                      key={color}
                      label={color}
                      onRemove={() => toggleColor(color)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={cn(
                      'rounded-sm px-1 text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground',
                      NAV_ITEM,
                      FOCUS_RING,
                    )}
                  >
                    {t('categories.detail.categoryPageClient.clearAll')}
                  </button>
                </div>
              )}
            </div>

            {/* Results */}
            {loading ? (
              viewMode === 'list' ? (
                <ProductListSkeleton count={5} />
              ) : (
                <ProductGridSkeleton count={PAGE_SIZE} className="xl:grid-cols-3" />
              )
            ) : products.length > 0 ? (
              viewMode === 'list' ? (
                <div className="space-y-6">
                  {products.map((product) => (
                    <ProductRow key={product._id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:gap-y-12">
                  {products.map((product) => (
                    <ProductCardRegular
                      key={product._id}
                      product={product}
                      className="h-full"
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="border border-border bg-muted/30 px-6 py-16 text-center">
                <h2 className="font-navigation text-lg font-semibold text-foreground">
                  {t('categories.detail.categoryPageClient.noProductsFound')}
                </h2>
                <p className="mx-auto mt-3 max-w-md font-paragraph text-sm leading-relaxed text-muted-foreground">
                  {hasActiveFilters
                    ? t('categories.detail.categoryPageClient.nothingMatchesFilters', { category: category.name })
                    : t('categories.detail.categoryPageClient.noProductsRightNow', { category: category.name })}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  {hasActiveFilters && (
                    <Button onClick={clearFilters} className="rounded-sm">
                      {t('categories.detail.categoryPageClient.clearAllFilters')}
                    </Button>
                  )}
                  <Button asChild variant="outline" className="rounded-sm">
                    <Link href="/categories">{t('categories.detail.categoryPageClient.browseAllCategories')}</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <nav
                aria-label={t('categories.detail.categoryPageClient.pagination')}
                className="mt-14 flex items-center justify-center gap-3 border-t border-border pt-8"
              >
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={cn(
                    'h-10 rounded-sm border border-border px-5 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                    NAV_ITEM,
                    FOCUS_RING,
                  )}
                >
                  {t('categories.detail.categoryPageClient.previous')}
                </button>
                <span className={cn('text-muted-foreground', NAV_ITEM)}>
                  {t('common.pageOf', { page: page, pages: totalPages })}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={cn(
                    'h-10 rounded-sm border border-border px-5 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                    NAV_ITEM,
                    FOCUS_RING,
                  )}
                >
                  {t('categories.detail.categoryPageClient.next')}
                </button>
              </nav>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
