"use client";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import BuyNowButton from "@/components/products/BuyNowButton";
import ProductGallery from "@/components/products/ProductGallery";
import ProductRail from "@/components/products/ProductRail";
import ProductReviews, {
  type ProductReview,
} from "@/components/products/ProductReviews";
import ShareProduct from "@/components/products/ShareProduct";
import SizeVisualizer from "@/components/products/SizeVisualizer";
import StarRating from "@/components/products/StarRating";
import AddToCartButton from "@/components/ui/add-to-cart-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Product as ProductCardData } from "@/components/ui/product-card-regular";
import {
  getRecentlyViewed,
  recordRecentlyViewed,
} from "@/lib/products/recently-viewed";
import {
  addToWishlist,
  removeFromWishlist,
} from "@/lib/store/slices/wishlistSlice";
import { RootState } from "@/lib/store/store";
import { legacyToMedia, type MediaItem } from "@/lib/products/types";
import type { SizeVisualizerConfig } from "@/lib/products/types";
import { formatBDTCurrency } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface ProductVariant {
  id?: string;
  attributeName?: string;
  attributeValue?: string;
  name?: string;
  value?: string;
  price?: number;
  comparePrice?: number;
  sku?: string;
  quantity?: number;
  trackQuantity?: boolean;
  thumbnailImage?: string;
  image?: string;
  media?: MediaItem[];
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  editorsNotes?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  thumbnailImage: string;
  images: string[];
  videoLinks?: string[];
  media?: MediaItem[];
  quantity?: number;
  trackQuantity?: boolean;
  variantMode?: "single" | "multi";
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  variants?: ProductVariant[];
  dimensions?: {
    length: string | number;
    width: string | number;
    height: string | number;
  };
  weight?: string | number;
  sizeVisualizer?: SizeVisualizerConfig;
  reviews?: ProductReview[];
  averageRating?: number;
  totalReviews?: number;
}

interface RelatedProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage: string;
  images?: string[];
  averageRating?: number;
  totalReviews?: number;
  category?: {
    name: string;
    slug: string;
  };
}

function variantLabel(v: ProductVariant) {
  return v.attributeValue || v.value || "";
}

function variantAttr(v: ProductVariant) {
  return v.attributeName || v.name || "Color";
}

function variantMedia(v: ProductVariant, fallback: MediaItem[]): MediaItem[] {
  if (Array.isArray(v.media) && v.media.length) return v.media;
  if (v.thumbnailImage || v.image) {
    return legacyToMedia([v.thumbnailImage || v.image || ""], []);
  }
  return fallback;
}

function variantSoldOut(v: ProductVariant) {
  if (v.trackQuantity === false) return false;
  return typeof v.quantity === "number" ? v.quantity <= 0 : false;
}

export interface ProductPageClientProps {
  /**
   * The product and its related set, resolved by the server page. Present on the
   * real route, so the PDP is in the initial HTML rather than appearing after a
   * post-hydration fetch; `null` only if the server read failed, in which case
   * the component fetches for itself.
   */
  initialProduct?: Product | null;
  initialRelatedProducts?: RelatedProduct[] | null;
}

export default function ProductPageClient({
  initialProduct,
  initialRelatedProducts,
}: ProductPageClientProps = {}) {
  const { t } = useTranslation();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);

  const [loading, setLoading] = useState(!initialProduct);
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>(
    (initialRelatedProducts || []).slice(0, 6),
  );
  const [recentlyViewed, setRecentlyViewed] = useState<ProductCardData[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [sizeOpen, setSizeOpen] = useState(false);

  /** First in-stock variant, so the page opens on something buyable. */
  const selectDefaultVariant = (variants: ProductVariant[]) => {
    if (!variants.length) return;
    const firstAvailable = variants.find((v) => !variantSoldOut(v)) || variants[0];
    setSelectedVariantId(
      firstAvailable.id ||
        `${variantAttr(firstAvailable)}-${variantLabel(firstAvailable)}`,
    );
  };

  useEffect(() => {
    // Already resolved by the server page, which shares its cache entry with
    // `/api/products/[slug]` — so this route reads the document once, not three
    // times.
    if (initialProduct) {
      setProduct(initialProduct);
      setRelatedProducts((initialRelatedProducts || []).slice(0, 6));
      selectDefaultVariant(initialProduct.variants || []);
      setLoading(false);
      return;
    }

    if (!params.slug) return;
    const controller = new AbortController();

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products/${params.slug}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.product) {
          router.push("/products");
          return;
        }
        setProduct(data.product);
        setRelatedProducts((data.relatedProducts || []).slice(0, 6));
        selectDefaultVariant(data.product.variants || []);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        router.push("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    return () => controller.abort();
    // `selectDefaultVariant` is a stable closure over setState only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, router, initialProduct, initialRelatedProducts]);

  // Show the rail as it was before this visit, then record the current product
  useEffect(() => {
    if (!product) return;
    setRecentlyViewed(
      getRecentlyViewed()
        .filter((item) => item._id !== product._id)
        .slice(0, 8),
    );
    recordRecentlyViewed({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice,
      thumbnailImage: product.thumbnailImage,
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
      category: product.category
        ? { name: product.category.name, slug: product.category.slug }
        : undefined,
    });
  }, [product]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantId]);

  const baseMedia = useMemo(() => {
    if (!product) return [];
    if (product.media?.length) return product.media;
    return legacyToMedia(product.images || [], product.videoLinks || []);
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return (
      product.variants.find((v) => {
        const id = v.id || `${variantAttr(v)}-${variantLabel(v)}`;
        return id === selectedVariantId;
      }) || product.variants[0]
    );
  }, [product, selectedVariantId]);

  const galleryMedia = useMemo(() => {
    if (!product) return [];
    if (product.variantMode === "multi" && selectedVariant) {
      return variantMedia(selectedVariant, baseMedia);
    }
    if (baseMedia.length) return baseMedia;
    return legacyToMedia(
      [product.thumbnailImage, ...(product.images || [])].filter(Boolean),
      product.videoLinks || [],
    );
  }, [product, selectedVariant, baseMedia]);

  // Keep the visualizer in sync with the selected swatch
  const visualizerImage = useMemo(() => {
    const firstImage = galleryMedia.find((item) => item.type === "image");
    return (
      firstImage?.url ||
      selectedVariant?.thumbnailImage ||
      product?.thumbnailImage ||
      undefined
    );
  }, [galleryMedia, selectedVariant, product]);

  const selectedPrice =
    selectedVariant?.price ?? product?.price ?? 0;
  const selectedCompare =
    selectedVariant?.comparePrice ?? product?.comparePrice;
  const selectedSku = selectedVariant?.sku ?? product?.sku ?? "";
  const availableStock = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant) {
      if (selectedVariant.trackQuantity === false) return 999;
      return selectedVariant.quantity ?? 0;
    }
    if (product.trackQuantity === false) return 999;
    return product.quantity ?? 999;
  }, [product, selectedVariant]);

  const isInWishlist = product
    ? wishlistItems.some((item) => item.id === product._id)
    : false;

  const toggleWishlist = () => {
    if (!product) return;
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
      return;
    }
    dispatch(
      addToWishlist({
        id: product._id,
        name: product.name,
        price: selectedPrice,
        image: product.thumbnailImage,
        comparePrice: selectedCompare,
        inStock: availableStock > 0,
      }),
    );
  };

  const attributeGroups = useMemo(() => {
    if (!product?.variants?.length) return {} as Record<string, ProductVariant[]>;
    return product.variants.reduce(
      (acc, variant) => {
        const name = variantAttr(variant);
        if (!acc[name]) acc[name] = [];
        acc[name].push(variant);
        return acc;
      },
      {} as Record<string, ProductVariant[]>,
    );
  }, [product?.variants]);

  if (loading) {
    return (
      <div className="min-h-screen bg-card">
        <Header />
        <div className="luxury-container pt-28 md:pt-40">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="aspect-[4/5] animate-pulse bg-muted" />
            <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse bg-accent" />
              <div className="h-12 w-4/5 animate-pulse bg-accent" />
              <div className="h-8 w-40 animate-pulse bg-accent" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  // Editorial band: a detail shot paired with the product story
  const detailImages = galleryMedia.filter((item) => item.type === "image");
  const closerLookText = product.shortDescription || product.description || "";
  const closerLook =
    detailImages.length > 1 && closerLookText
      ? { image: detailImages[1].url, text: closerLookText }
      : null;

  const showVisualizer =
    product.sizeVisualizer?.enabled &&
    product.dimensions &&
    Boolean(
      String(product.dimensions.height || '').trim() ||
        String(product.dimensions.width || '').trim() ||
        String(product.dimensions.length || '').trim(),
    );

  return (
    <div className="min-h-screen bg-card">
      <Header />

      <main className="luxury-container pb-20 pt-8 md:pt-12">
        <nav className="mb-8 text-xs uppercase tracking-[0.1em] text-subtle-foreground">
          <Link href="/">{t('products.detail.productPageClient.home')}</Link>
          <span className="mx-2">/</span>
          <Link href="/products">{t('products.detail.productPageClient.products')}</Link>
          <span className="mx-2">/</span>
          <Link href={`/categories/${product.category.slug}`}>
            {product.category.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-10">
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <ProductGallery
              key={selectedVariantId || "single"}
              media={galleryMedia}
              productName={product.name}
              onToggleWishlist={toggleWishlist}
              isInWishlist={isInWishlist}
            />
          </div>

          <aside className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle-foreground">
              {product.category.name}
            </p>
            <h1 className="mt-3 break-words font-title text-[26px] leading-[1.15] tracking-tight text-foreground sm:text-[30px] lg:text-[34px]">
              {product.name}
            </h1>
            {product.totalReviews ? (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 text-xs font-navigation text-subtle-foreground transition-colors hover:text-foreground"
              >
                <StarRating value={product.averageRating || 0} size={13} precise />
                <span>
                  {(product.averageRating || 0).toFixed(1)} ({product.totalReviews})
                </span>
              </a>
            ) : null}
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className="text-xl font-price tracking-tight text-foreground">
                {formatBDTCurrency(selectedPrice)}
              </p>
              {selectedCompare && selectedCompare > selectedPrice ? (
                <p className="text-base font-caption text-subtle-foreground line-through">
                  {formatBDTCurrency(selectedCompare)}
                </p>
              ) : null}
            </div>
            {selectedSku ? (
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle-foreground">
                {t('products.detail.productPageClient.sku')} {selectedSku}
              </p>
            ) : null}

            <div className="mt-8 space-y-6">
              {Object.entries(attributeGroups).map(([name, options]) => (
                <div key={name}>
                  <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle-foreground">
                    {name}
                    {selectedVariant && variantAttr(selectedVariant) === name
                      ? ` · ${variantLabel(selectedVariant)}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const id =
                        option.id ||
                        `${variantAttr(option)}-${variantLabel(option)}`;
                      const isActive = selectedVariantId === id;
                      const soldOut = variantSoldOut(option);
                      const swatch =
                        option.thumbnailImage || option.image || "";
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={soldOut}
                          title={
                            soldOut
                              ? t('products.detail.productPageClient.variantSoldOut', { variant: variantLabel(option) })
                              : variantLabel(option)
                          }
                          onClick={() => setSelectedVariantId(id)}
                          className={`relative h-16 w-16 border p-[3px] transition-colors ${
                            isActive
                              ? "border-foreground"
                              : "border-border hover:border-border"
                          } ${soldOut ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <span className="relative block h-full w-full overflow-hidden bg-muted">
                            {swatch ? (
                              <Image
                                src={swatch}
                                alt={variantLabel(option)}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center px-1 text-center text-[10px] uppercase leading-tight">
                                {variantLabel(option)}
                              </span>
                            )}
                            {soldOut ? (
                              <span className="absolute inset-0 bg-card/50" />
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-3">
              <div className="flex gap-3">
                <div className="relative shrink-0">
                  <label htmlFor="pdp-quantity" className="sr-only">
                    {t('products.detail.productPageClient.quantity')}
                  </label>
                  <select
                    id="pdp-quantity"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    disabled={availableStock <= 0}
                    className="h-12 w-[76px] appearance-none rounded-none border border-foreground bg-card pl-4 pr-8 text-sm font-paragraph text-foreground outline-none disabled:cursor-not-allowed disabled:border-border disabled:text-subtle-foreground"
                  >
                    {Array.from(
                      { length: Math.max(1, Math.min(availableStock || 1, 10)) },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
                </div>

                <AddToCartButton
                  productId={product._id}
                  productName={product.name}
                  productPrice={selectedPrice}
                  productImage={
                    galleryMedia.find((m) => m.type === "image")?.url ||
                    product.thumbnailImage
                  }
                  productSlug={product.slug}
                  selectedVariants={
                    selectedVariant
                      ? {
                          [variantAttr(selectedVariant)]:
                            variantLabel(selectedVariant),
                        }
                      : {}
                  }
                  quantity={quantity}
                  variant="full"
                  size="lg"
                  showIcon={false}
                  availableStock={availableStock}
                  isOutOfStock={availableStock <= 0}
                  text={t('products.detail.productPageClient.addToBag')}
                  className="h-12 flex-1 rounded-none !bg-primary text-xs font-button uppercase tracking-[0.12em] hover:!bg-primary/90"
                />
              </div>

              <BuyNowButton
                productId={product._id}
                productName={product.name}
                productPrice={selectedPrice}
                productImage={
                  galleryMedia.find((m) => m.type === "image")?.url ||
                  product.thumbnailImage
                }
                variant={
                  selectedVariant
                    ? `${variantAttr(selectedVariant)}: ${variantLabel(
                        selectedVariant,
                      )}`
                    : ""
                }
                quantity={quantity}
                availableStock={availableStock}
              />
              </div>

              <p className="text-sm text-muted-foreground">
                {t('products.detail.productPageClient.complimentaryShippingAndReturnsInGermany')}
              </p>

              <Accordion
                type="single"
                collapsible
                className="border-t border-border"
              >
                <AccordionItem value="shipping" className="border-border">
                  <AccordionTrigger className="py-4 text-left text-[11px] font-label uppercase tracking-[0.16em] text-foreground hover:no-underline">
                    {t('products.detail.productPageClient.shippingReturns')}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {t('products.detail.productPageClient.freeStandardShippingOnQualifyingOrders')}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="details" className="border-border">
                  <AccordionTrigger className="py-4 text-left text-[11px] font-label uppercase tracking-[0.16em] text-foreground hover:no-underline">
                    {t('products.detail.productPageClient.productDetails')}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          product.description ||
                          product.shortDescription ||
                          t('products.detail.productPageClient.noDescriptionAvailableYet'),
                      }}
                    />
                    {product.dimensions &&
                    (product.dimensions.length ||
                      product.dimensions.width ||
                      product.dimensions.height) ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-[11px] font-label uppercase tracking-[0.16em] text-subtle-foreground">
                          {t('products.detail.productPageClient.measurement')}
                        </p>
                        {product.dimensions.length ? (
                          <p>{t('products.detail.productPageClient.length')} {product.dimensions.length}</p>
                        ) : null}
                        {product.dimensions.height ? (
                          <p>{t('products.detail.productPageClient.height')} {product.dimensions.height}</p>
                        ) : null}
                        {product.dimensions.width ? (
                          <p>{t('products.detail.productPageClient.width')} {product.dimensions.width}</p>
                        ) : null}
                        {product.weight ? <p>{t('products.detail.productPageClient.weight')} {product.weight}</p> : null}
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {showVisualizer ? (
                <div className="border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setSizeOpen((o) => !o)}
                    className="text-xs uppercase tracking-[0.14em] text-foreground underline underline-offset-4"
                  >
                    {sizeOpen ? t('products.detail.productPageClient.hideBagSize') : t('products.detail.productPageClient.seeBagSize')}
                  </button>
                  {sizeOpen ? (
                    <div className="mt-5">
                      <SizeVisualizer
                        productName={product.name}
                        dimensions={product.dimensions!}
                        config={product.sizeVisualizer!}
                        productImage={visualizerImage}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {(product.editorsNotes || product.shortDescription) && (
                <div className="border-t border-border pt-6">
                  <p className="text-xs uppercase tracking-[0.1em] text-subtle-foreground">
                    {t('products.detail.productPageClient.editorSNotes')}
                  </p>
                  <div
                    className="mt-3 text-sm leading-relaxed text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html:
                        product.editorsNotes ||
                        product.shortDescription ||
                        "",
                    }}
                  />
                </div>
              )}

              <ShareProduct
                className="border-t border-border pt-6"
                productName={product.name}
                productSlug={product.slug}
                productImage={
                  galleryMedia.find((m) => m.type === "image")?.url ||
                  product.thumbnailImage
                }
                price={formatBDTCurrency(selectedPrice)}
              />
            </div>
          </aside>
        </section>

        {closerLook ? (
          <section className="mt-20 grid items-center gap-10 border-t border-border pt-14 md:grid-cols-2 md:gap-16">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              <Image
                src={closerLook.image}
                alt={t('common.productDetailImage', { product: product.name })}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <div className="max-w-md">
              <h2 className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
                {t('products.detail.productPageClient.aCloserLook')}
              </h2>
              <div
                className="mt-4 text-sm leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: closerLook.text }}
              />
            </div>
          </section>
        ) : null}

        <div className="mt-20 space-y-16">
          <ProductRail
            title={t('products.detail.productPageClient.youMayAlsoLike')}
            eyebrow={t('products.detail.productPageClient.completeTheLook')}
            products={relatedProducts as ProductCardData[]}
          />

          <ProductRail title={t('products.detail.productPageClient.recentlyViewed')} products={recentlyViewed} />

          <ProductReviews
            productSlug={product.slug}
            initialReviews={product.reviews || []}
            initialAverage={product.averageRating || 0}
            initialTotal={product.totalReviews || 0}
          />
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
