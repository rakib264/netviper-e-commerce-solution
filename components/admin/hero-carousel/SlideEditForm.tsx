'use client';

import FileUpload from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyHeroProduct,
  emptyHeroSlideInput,
  getSlideProducts,
  isVideoAssetUrl,
  MAX_HERO_PRODUCTS,
  type HeroSlide,
  type HeroSlideInput,
  type HeroSlideProduct,
} from '@/lib/hero-carousel/types';
import { formatEuroCurrency } from '@/lib/utils';
import {
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';

interface CatalogProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnailImage?: string;
  averageRating?: number;
}

interface SlideEditFormProps {
  slide?: HeroSlide | null;
  submitting?: boolean;
  onSubmit: (values: HeroSlideInput) => Promise<void> | void;
  onCancel: () => void;
}

function MediaPreview({
  url,
  isVideo,
  onClear,
  className = 'h-36 w-full',
}: {
  url: string;
  isVideo?: boolean;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div
      className={`relative mt-2 overflow-hidden border border-border bg-muted ${className}`}
    >
      {isVideo ? (
        <video
          src={url}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
          loop
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      <button
        type="button"
        onClick={onClear}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-primary text-white shadow-lg"
        aria-label="Clear media"
      >
        <X className="h-4 w-4 text-white" strokeWidth={2.25} />
      </button>
    </div>
  );
}

export default function SlideEditForm({
  slide,
  submitting,
  onSubmit,
  onCancel,
}: SlideEditFormProps) {
  const [values, setValues] = useState<HeroSlideInput>(emptyHeroSlideInput());
  const [assetUrlDraft, setAssetUrlDraft] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<CatalogProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  useEffect(() => {
    if (slide) {
      const products = getSlideProducts(slide);
      setValues({
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        description: slide.description || '',
        image: slide.image || '',
        backgroundVideo: slide.backgroundVideo || '',
        ctaButtons: slide.ctaButtons?.length
          ? slide.ctaButtons
          : [
              {
                label: slide.ctaButtonLabel || 'Shop Now',
                url: slide.ctaButtonUrl || '/products',
              },
            ],
        products,
        isActive: slide.isActive ?? true,
        order: slide.order ?? 0,
      });
      setAssetUrlDraft(slide.backgroundVideo || slide.image || '');
    } else {
      setValues(emptyHeroSlideInput());
      setAssetUrlDraft('');
    }
  }, [slide]);

  const setField = <K extends keyof HeroSlideInput>(key: K, value: HeroSlideInput[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const products = values.products || [];

  const updateProduct = (index: number, patch: Partial<HeroSlideProduct>) => {
    setValues((prev) => {
      const next = [...(prev.products || [])];
      next[index] = { ...next[index], ...patch };
      return { ...prev, products: next };
    });
  };

  const removeProduct = (index: number) => {
    setValues((prev) => ({
      ...prev,
      products: (prev.products || []).filter((_, i) => i !== index),
    }));
  };

  const addManualProduct = () => {
    if (products.length >= MAX_HERO_PRODUCTS) return;
    setValues((prev) => ({
      ...prev,
      products: [...(prev.products || []), emptyHeroProduct()],
    }));
  };

  const applyBackgroundAsset = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setField('image', '');
      setField('backgroundVideo', '');
      setAssetUrlDraft('');
      return;
    }
    if (isVideoAssetUrl(trimmed)) {
      setValues((prev) => ({
        ...prev,
        backgroundVideo: trimmed,
        image: prev.image && !isVideoAssetUrl(prev.image) ? prev.image : trimmed,
      }));
    } else {
      setValues((prev) => ({
        ...prev,
        image: trimmed,
        backgroundVideo: '',
      }));
    }
    setAssetUrlDraft(trimmed);
  };

  const clearBackgroundAsset = () => {
    setField('image', '');
    setField('backgroundVideo', '');
    setAssetUrlDraft('');
  };

  const backgroundPreview = values.backgroundVideo || values.image;
  const backgroundIsVideo = Boolean(values.backgroundVideo);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setProductLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '20',
          active: 'true',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (productQuery.trim()) params.set('search', productQuery.trim());
        const res = await fetch(`/api/admin/products?${params}`);
        const data = await res.json();
        setProductResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        setProductResults([]);
      } finally {
        setProductLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [productQuery]);

  const addCatalogProduct = (product: CatalogProduct) => {
    if (products.length >= MAX_HERO_PRODUCTS) return;
    if (products.some((p) => p.productId === product._id)) return;

    const entry: HeroSlideProduct = {
      productId: product._id,
      productSlug: product.slug,
      productName: product.name,
      productImage: product.thumbnailImage || '',
      price: product.price || 0,
      comparePrice: product.comparePrice || 0,
      rating:
        typeof product.averageRating === 'number' && product.averageRating > 0
          ? product.averageRating
          : 5,
    };

    setValues((prev) => {
      const nextProducts = [...(prev.products || []), entry];
      const cta = prev.ctaButtons?.[0];
      return {
        ...prev,
        products: nextProducts,
        ctaButtons: [
          {
            label: cta?.label || 'Shop Now',
            url: cta?.url?.startsWith('/products/')
              ? cta.url
              : `/products/${product.slug}`,
          },
        ],
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.image && !values.backgroundVideo) return;
    const payload: HeroSlideInput = {
      ...values,
      image: values.image || values.backgroundVideo || '',
      products: products.filter(
        (p) => p.productName?.trim() || p.productImage?.trim() || (p.price || 0) > 0
      ),
    };
    await onSubmit(payload);
  };

  const cta = values.ctaButtons?.[0] || { label: 'Shop Now', url: '/products' };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Campaign
          </p>
          <div>
            <Label htmlFor="title">Headline *</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => setField('title', e.target.value)}
              className="mt-1.5 border-border"
              required
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              className="mt-1.5 resize-none border-border"
              rows={3}
              maxLength={400}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ctaLabel">CTA text</Label>
              <Input
                id="ctaLabel"
                value={cta.label}
                onChange={(e) =>
                  setField('ctaButtons', [{ label: e.target.value, url: cta.url }])
                }
                className="mt-1.5 border-border"
              />
            </div>
            <div>
              <Label htmlFor="ctaUrl">CTA link</Label>
              <Input
                id="ctaUrl"
                value={cta.url}
                onChange={(e) =>
                  setField('ctaButtons', [{ label: cta.label, url: e.target.value }])
                }
                className="mt-1.5 border-border"
                placeholder="/products"
              />
            </div>
          </div>

          <div className="space-y-2 border border-border p-4">
            <Label>Background asset *</Label>
            <p className="text-xs font-caption text-subtle-foreground">
              Upload image or video to Bunny CDN, or paste a URL.
            </p>
            <FileUpload
              accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              multiple={false}
              maxSize={25 * 1024 * 1024}
              onUpload={(url) => applyBackgroundAsset(url)}
            />
            <div className="flex gap-2">
              <Input
                value={assetUrlDraft}
                onChange={(e) => setAssetUrlDraft(e.target.value)}
                className="border-border"
                placeholder="https://cdn…/asset.jpg or .mp4"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => applyBackgroundAsset(assetUrlDraft)}
              >
                Use URL
              </Button>
            </div>
            {backgroundPreview ? (
              <MediaPreview
                url={backgroundPreview}
                isVideo={backgroundIsVideo}
                onClear={clearBackgroundAsset}
              />
            ) : null}
          </div>

          <div>
            <Label htmlFor="order">Sort order</Label>
            <Input
              id="order"
              type="number"
              min={0}
              value={values.order ?? 0}
              onChange={(e) => setField('order', Number(e.target.value))}
              className="mt-1.5 border-border"
            />
          </div>
          <div className="flex items-center gap-3 border border-border bg-muted px-4 py-3">
            <Switch
              id="isActive"
              checked={Boolean(values.isActive)}
              onCheckedChange={(checked) => setField('isActive', checked)}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="isActive">Active on homepage</Label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Floating product cards ({products.length}/{MAX_HERO_PRODUCTS})
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={products.length >= MAX_HERO_PRODUCTS}
              onClick={addManualProduct}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Manual
            </Button>
          </div>

          <div className="space-y-3 border border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search catalog to add…"
                className="border-border pl-9"
                disabled={products.length >= MAX_HERO_PRODUCTS}
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-border">
              {productLoading ? (
                <p className="px-3 py-3 text-sm text-subtle-foreground">Searching…</p>
              ) : productResults.length === 0 ? (
                <p className="px-3 py-3 text-sm text-subtle-foreground">No products found.</p>
              ) : (
                productResults.map((product) => {
                  const already = products.some((p) => p.productId === product._id);
                  return (
                    <button
                      key={product._id}
                      type="button"
                      disabled={already || products.length >= MAX_HERO_PRODUCTS}
                      onClick={() => addCatalogProduct(product)}
                      className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted disabled:opacity-40"
                    >
                      {product.thumbnailImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.thumbnailImage}
                          alt=""
                          className="h-9 w-9 object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{product.name}</p>
                        <p className="text-xs font-price text-subtle-foreground">
                          {formatEuroCurrency(product.price)}
                          {already ? ' · added' : ''}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-foreground" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {products.length === 0 ? (
            <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-subtle-foreground">
              Add up to {MAX_HERO_PRODUCTS} products from catalog or manually.
            </p>
          ) : (
            <div className="space-y-4">
              {products.map((product, index) => (
                <div
                  key={`${product.productId || 'manual'}-${index}`}
                  className="space-y-3 border border-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Card {index + 1}
                      {product.productId ? ' · catalog' : ' · manual'}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white"
                      aria-label="Remove product card"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                  <div>
                    <Label>Product name</Label>
                    <Input
                      value={product.productName || ''}
                      onChange={(e) =>
                        updateProduct(index, { productName: e.target.value })
                      }
                      className="mt-1.5 border-border"
                    />
                  </div>
                  <div>
                    <Label>Product image</Label>
                    <div className="mt-1.5">
                      <FileUpload
                        accept="image/*"
                        multiple={false}
                        onUpload={(url) =>
                          updateProduct(index, { productImage: url })
                        }
                      />
                    </div>
                    {product.productImage ? (
                      <MediaPreview
                        url={product.productImage}
                        onClear={() => updateProduct(index, { productImage: '' })}
                        className="h-32 w-32"
                      />
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={product.price ?? 0}
                        onChange={(e) =>
                          updateProduct(index, { price: Number(e.target.value) })
                        }
                        className="mt-1.5 border-border"
                      />
                    </div>
                    <div>
                      <Label>Original</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={product.comparePrice ?? 0}
                        onChange={(e) =>
                          updateProduct(index, {
                            comparePrice: Number(e.target.value),
                          })
                        }
                        className="mt-1.5 border-border"
                      />
                    </div>
                    <div>
                      <Label>Rating</Label>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step="0.1"
                        value={product.rating ?? 5}
                        onChange={(e) =>
                          updateProduct(index, { rating: Number(e.target.value) })
                        }
                        className="mt-1.5 border-border"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || (!values.image && !values.backgroundVideo)}
        >
          {submitting ? <Loader size="sm" label={null} className="mr-2" /> : null}
          {slide ? 'Update slide' : 'Create slide'}
        </Button>
      </div>
    </form>
  );
}
