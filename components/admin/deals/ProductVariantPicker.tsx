'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Package, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PickerSelection {
  productId: string;
  variantId: string | null;
  /** Display label, resolved when the picker loads the product. */
  label?: string;
  image?: string;
  price?: number;
}

interface PickerProduct {
  _id: string;
  name: string;
  price: number;
  thumbnailImage?: string;
  quantity?: number;
  trackQuantity?: boolean;
  variantMode?: 'single' | 'multi';
  variants?: Array<{
    id: string;
    attributeName?: string;
    attributeValue?: string;
    value?: string;
    price: number;
    quantity?: number;
    trackQuantity?: boolean;
    thumbnailImage?: string;
  }>;
}

interface ProductVariantPickerProps {
  value: PickerSelection | null;
  onChange: (selection: PickerSelection | null) => void;
  /** Restrict the list to products flagged giftable. */
  giftableOnly?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Searchable product picker that drills into a variant when the product has
 * them. Gifts and mystery-box entries are variant-level, so a multi-variant
 * product cannot be selected without choosing which one ships.
 */
export default function ProductVariantPicker({
  value,
  onChange,
  giftableOnly = true,
  placeholder = 'Search products...',
  disabled = false,
}: ProductVariantPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProducts = useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '20', active: 'true' });
        if (term) params.set('search', term);
        if (giftableOnly) params.set('giftable', 'true');
        const res = await fetch(`/api/admin/products?${params.toString()}`);
        const data = await res.json();
        setProducts(res.ok ? data.products || [] : []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [giftableOnly]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchProducts(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, search, fetchProducts]);

  // Resolve the label for an already-saved selection so reopening a deal shows
  // a product name rather than a bare id. Attempted once per product: the
  // parent passes a fresh `onChange` on every render, so without the guard a
  // product that fails to resolve would be refetched on each one.
  const resolved = useRef<string | null>(null);
  useEffect(() => {
    if (!value?.productId || value.label) return;
    if (resolved.current === value.productId) return;
    resolved.current = value.productId;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${value.productId}`);
        const data = await res.json();
        const product: PickerProduct = data.product || data;
        if (cancelled || !product?._id) return;
        onChange({ ...value, ...describe(product, value.variantId) });
      } catch {
        /* leave the id showing rather than clearing a valid selection */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, onChange]);

  const triggerLabel = useMemo(() => {
    if (!value?.productId) return placeholder;
    return value.label || 'Selected product';
  }, [value, placeholder]);

  const select = (product: PickerProduct, variantId: string | null) => {
    onChange(describe(product, variantId));
    setOpen(false);
    setExpandedId(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('flex items-center gap-2 truncate', !value?.productId && 'text-muted-foreground')}>
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={placeholder}
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <ScrollArea className="max-h-72">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching...</p>
          ) : products.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {giftableOnly
                ? 'No giftable products found. Mark a product as giftable on its edit page first.'
                : 'No products found.'}
            </p>
          ) : (
            <ul className="py-1">
              {products.map((product) => {
                const variants = product.variants || [];
                const hasVariants = product.variantMode === 'multi' && variants.length > 0;
                const isExpanded = expandedId === product._id;

                return (
                  <li key={product._id}>
                    <button
                      type="button"
                      onClick={() =>
                        hasVariants ? setExpandedId(isExpanded ? null : product._id) : select(product, null)
                      }
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Thumb src={product.thumbnailImage} alt={product.name} />
                      <span className="flex-1 truncate">{product.name}</span>
                      {hasVariants ? (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {variants.length} variants
                        </Badge>
                      ) : (
                        <StockPill
                          tracked={product.trackQuantity !== false}
                          quantity={product.quantity ?? 0}
                        />
                      )}
                      {value?.productId === product._id && !value.variantId && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>

                    {hasVariants && isExpanded && (
                      <ul className="border-l-2 border-border/70 pl-3 ml-5">
                        {variants.map((variant) => (
                          <li key={variant.id}>
                            <button
                              type="button"
                              onClick={() => select(product, variant.id)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                              <span className="flex-1 truncate">
                                {variant.attributeValue || variant.value || variant.id}
                              </span>
                              <StockPill
                                tracked={variant.trackQuantity !== false}
                                quantity={variant.quantity ?? 0}
                              />
                              {value?.variantId === variant.id && (
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {value?.productId && (
          <div className="border-t border-border px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function describe(product: PickerProduct, variantId: string | null): PickerSelection {
  const variant = variantId ? (product.variants || []).find((entry) => entry.id === variantId) : null;
  const variantLabel = variant?.attributeValue || variant?.value;
  return {
    productId: product._id,
    variantId: variant?.id ?? null,
    label: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
    image: variant?.thumbnailImage || product.thumbnailImage,
    price: variant?.price ?? product.price,
  };
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent">
        <Package className="h-4 w-4 text-muted-foreground" />
      </span>
    );
  }
  return <img src={src} alt={alt} className="h-8 w-8 shrink-0 rounded object-cover" />;
}

function StockPill({ tracked, quantity }: { tracked: boolean; quantity: number }) {
  if (!tracked) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 text-xs',
        quantity > 0
          ? 'border-success-200 bg-success-50 text-success-700'
          : 'border-destructive-200 bg-destructive-50 text-destructive-700'
      )}
    >
      {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}
    </Badge>
  );
}
