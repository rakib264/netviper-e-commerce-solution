"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ProductCardRegular, {
  type Product,
} from "@/components/ui/product-card-regular";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface Category {
  _id: string;
  name: string;
  slug: string;
  parent?: {
    _id: string;
  } | null;
}

type SortMode = "newest" | "price-asc" | "price-desc" | "name";

const sortToQuery: Record<SortMode, { sortBy: string; sortOrder: string }> = {
  newest: { sortBy: "createdAt", sortOrder: "desc" },
  "price-asc": { sortBy: "price", sortOrder: "asc" },
  "price-desc": { sortBy: "price", sortOrder: "desc" },
  name: { sortBy: "name", sortOrder: "asc" },
};

const PAGE_SIZE = 12;

export interface ProductsPageClientProps {
  /** First page of the unfiltered listing, resolved by the server page. */
  initialProducts?: Product[] | null;
  initialTotal?: number;
  initialPages?: number;
  /** Root categories for the filter, resolved by the server page. */
  initialCategories?: Category[] | null;
}

export default function ProductsPageClient({
  initialProducts,
  initialTotal = 0,
  initialPages = 1,
  initialCategories,
}: ProductsPageClientProps = {}) {
  const { t, tPlural } = useTranslation();
  const [categories, setCategories] = useState<Category[]>(
    initialCategories || [],
  );
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPages || 1);
  const [totalProducts, setTotalProducts] = useState(initialTotal);

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const debouncedSearch = useDebounce(searchInput, 450);
  const limit = PAGE_SIZE;

  useEffect(() => {
    if (initialCategories) return;
    const controller = new AbortController();

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setCategories((data.categories || []).filter((c: Category) => !c.parent));
      } catch {
        setCategories([]);
      }
    };

    fetchCategories();
    return () => controller.abort();
  }, [initialCategories]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("search", debouncedSearch);

    if (selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }

    params.set("sortBy", sortToQuery[sortMode].sortBy);
    params.set("sortOrder", sortToQuery[sortMode].sortOrder);
    return params.toString();
  }, [debouncedSearch, page, selectedCategory, sortMode]);

  /**
   * The query the server already answered.
   *
   * Recomputed rather than captured so it cannot drift from `queryString`: the
   * first effect run would otherwise refetch the exact page that is already on
   * screen, which is a wasted request and a needless skeleton flash.
   */
  const serverQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", String(PAGE_SIZE));
    params.set("search", "");
    params.set("sortBy", sortToQuery.newest.sortBy);
    params.set("sortOrder", sortToQuery.newest.sortOrder);
    return params.toString();
  }, []);

  const servedFromServer = useRef(Boolean(initialProducts));

  useEffect(() => {
    if (servedFromServer.current && queryString === serverQueryString) return;
    servedFromServer.current = false;

    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products?${queryString}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setProducts([]);
          return;
        }
        const data = await response.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalProducts(data.pagination?.total || 0);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [queryString, serverQueryString]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, sortMode]);

  return (
    <div className="min-h-screen bg-card">
      <Header />

      <main className="luxury-container pb-20 pt-8 md:pb-10 md:pt-12">
        <section className="mb-12 border-b border-border pb-8">
          <p className="luxury-eyebrow">{t('products.collection')}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{t('products.leatherGoods')}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t('products.exploreHandbagsShoulderBagsWalletsBackpacks')}
          </p>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('products.searchProducts')}
              className="h-11 rounded-none border-border pl-9 focus-visible:ring-0"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11 rounded-none border-border">
              <SelectValue placeholder={t('products.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('products.allCategories')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortMode}
            onValueChange={(value) => setSortMode(value as SortMode)}
          >
            <SelectTrigger className="h-11 rounded-none border-border">
              <SelectValue placeholder={t('products.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('products.newest')}</SelectItem>
              <SelectItem value="price-asc">{t('products.priceLowToHigh')}</SelectItem>
              <SelectItem value="price-desc">{t('products.priceHighToLow')}</SelectItem>
              <SelectItem value="name">{t('products.nameAZ')}</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section>
          <div className="mb-6 text-xs font-label uppercase tracking-[0.1em] text-subtle-foreground">
            {loading ? t('products.loadingProducts') : tPlural('common.productCount', totalProducts)}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12">
              {Array.from({ length: limit }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted" />
                  <div className="mt-3 h-4 w-3/4 bg-accent" />
                  <div className="mt-2 h-3 w-1/2 bg-accent" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:gap-x-7 xl:grid-cols-4 xl:gap-y-12">
              {products.map((product) => (
                <ProductCardRegular
                  key={product._id}
                  product={product}
                  className="h-full"
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <h2 className="font-heading text-3xl text-foreground">
                {t('products.noProductsFound')}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {t('products.tryAnotherKeywordOrCategory')}
              </p>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <section className="mt-12 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="h-10 border border-border px-5 text-xs uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('products.previous')}
            </button>
            <span className="text-xs font-label uppercase tracking-[0.1em] text-muted-foreground">
              {t('common.pageOf', { page: page, pages: totalPages })}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page === totalPages}
              className="h-10 border border-border px-5 text-xs uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('products.next')}
            </button>
          </section>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
