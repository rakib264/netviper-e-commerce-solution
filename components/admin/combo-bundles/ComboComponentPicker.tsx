'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatEuroCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * The component picker for a combo/bundle.
 *
 * A combo is defined by *which* products, at *which* variant, in *what*
 * quantity — so a plain multi-select of product ids is not enough and the
 * shared `ProductSelector` cannot express it. This keeps that shape while
 * reusing the same search endpoint and the same list idiom, and it reports the
 * live component list prices upward so the editor can price the offer against
 * them.
 */

export interface PickerProduct {
  _id: string;
  name: string;
  slug?: string;
  price?: number;
  thumbnailImage?: string;
  quantity?: number;
  trackQuantity?: boolean;
  variants?: Array<{
    id?: string;
    attributeName?: string;
    attributeValue?: string;
    value?: string;
    price?: number;
    quantity?: number;
    trackQuantity?: boolean;
  }>;
}

export interface ComboComponentDraft {
  productId: string;
  variantId?: string;
  qty: number;
  /* Denormalised for display and for the savings preview. */
  name: string;
  image?: string;
  unitPrice: number;
  available: number;
  variants: PickerProduct['variants'];
}

export function draftFromProduct(
  product: PickerProduct,
  variantId?: string,
): ComboComponentDraft {
  const variant = variantId
    ? (product.variants || []).find((entry) => entry.id === variantId)
    : undefined;

  return {
    productId: product._id,
    variantId: variantId || undefined,
    qty: 1,
    name: product.name,
    image: product.thumbnailImage,
    unitPrice: Number(variant?.price || product.price || 0),
    available:
      (variant ? variant.trackQuantity : product.trackQuantity) === false
        ? Number.MAX_SAFE_INTEGER
        : Number((variant ? variant.quantity : product.quantity) ?? 0),
    variants: product.variants || [],
  };
}

export default function ComboComponentPicker({
  components,
  onChange,
  max,
  error,
}: {
  components: ComboComponentDraft[];
  onChange: (next: ComboComponentDraft[]) => void;
  max: number;
  error?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          limit: '15',
          active: 'true',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (query.trim()) params.set('search', query.trim());
        const response = await fetch(`/api/admin/products?${params.toString()}`);
        const data = await response.json();
        setResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const taken = new Set(
    components.map((component) => `${component.productId}:${component.variantId ?? ''}`),
  );

  const addProduct = (product: PickerProduct) => {
    if (components.length >= max) return;
    const draft = draftFromProduct(product);
    if (taken.has(`${draft.productId}:`)) return;
    onChange([...components, draft]);
  };

  const patch = (index: number, next: Partial<ComboComponentDraft>) => {
    onChange(
      components.map((component, position) =>
        position === index ? { ...component, ...next } : component,
      ),
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= components.length) return;
    const next = [...components];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.marketing.combos.form.searchProducts')}
          className="border-border pl-9"
          disabled={components.length >= max}
        />
      </div>

      <div className="max-h-40 overflow-y-auto border border-border">
        {searching ? (
          <p className="px-3 py-2 font-caption text-xs text-subtle-foreground">
            {t('admin.marketing.combos.form.searching')}
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2 font-caption text-xs text-subtle-foreground">
            {t('admin.marketing.combos.form.noProducts')}
          </p>
        ) : (
          results.map((product) => {
            const already = taken.has(`${product._id}:`);
            return (
              <button
                key={product._id}
                type="button"
                disabled={already || components.length >= max}
                onClick={() => addProduct(product)}
                className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted disabled:opacity-40"
              >
                {product.thumbnailImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnailImage}
                    alt=""
                    className="h-8 w-8 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">
                    {product.name}
                  </span>
                  <span className="block font-price text-xs text-subtle-foreground">
                    {formatEuroCurrency(product.price || 0)}
                  </span>
                </span>
                <Plus className="h-4 w-4 shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {components.length > 0 ? (
        <ul className="space-y-2">
          {components.map((component, index) => {
            const variants = (component.variants || []).filter(
              (variant) => variant.id,
            );
            return (
              <li
                key={`${component.productId}-${component.variantId ?? ''}-${index}`}
                className="flex flex-wrap items-center gap-3 border border-border bg-card p-3"
              >
                <span className="font-price text-xs text-subtle-foreground">
                  {index + 1}
                </span>

                {component.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={component.image}
                    alt=""
                    className="h-10 w-10 object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{component.name}</p>
                  <p className="font-price text-xs text-subtle-foreground">
                    {formatEuroCurrency(component.unitPrice)}
                    {component.available !== Number.MAX_SAFE_INTEGER ? (
                      <span className="ml-2 font-caption">
                        {t('admin.marketing.combos.form.inStock', {
                          count: component.available,
                        })}
                      </span>
                    ) : null}
                  </p>
                </div>

                {variants.length > 0 ? (
                  <Select
                    value={component.variantId || 'base'}
                    onValueChange={(value) => {
                      const variantId = value === 'base' ? undefined : value;
                      const variant = variants.find((entry) => entry.id === variantId);
                      patch(index, {
                        variantId,
                        unitPrice: Number(variant?.price ?? component.unitPrice),
                        available:
                          (variant ? variant.trackQuantity : undefined) === false
                            ? Number.MAX_SAFE_INTEGER
                            : Number(variant?.quantity ?? component.available),
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 w-[10rem] border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">
                        {t('admin.marketing.combos.form.anyVariant')}
                      </SelectItem>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id as string}>
                          {variant.attributeValue || variant.value || variant.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <div className="inline-flex items-center border border-border">
                  <button
                    type="button"
                    aria-label={t('admin.marketing.combos.form.decreaseQty')}
                    onClick={() => patch(index, { qty: Math.max(1, component.qty - 1) })}
                    className="flex h-9 w-9 items-center justify-center text-foreground hover:bg-muted"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 px-1 text-center font-price text-sm">
                    {component.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={t('admin.marketing.combos.form.increaseQty')}
                    onClick={() => patch(index, { qty: Math.min(20, component.qty + 1) })}
                    className="flex h-9 w-9 items-center justify-center text-foreground hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t('admin.marketing.combos.form.moveUp')}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="flex h-9 w-9 items-center justify-center border border-border text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('admin.marketing.combos.form.moveDown')}
                    disabled={index === components.length - 1}
                    onClick={() => move(index, 1)}
                    className="flex h-9 w-9 items-center justify-center border border-border text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('admin.marketing.combos.form.removeComponent')}
                    onClick={() =>
                      onChange(components.filter((_, position) => position !== index))
                    }
                    className="flex h-9 w-9 items-center justify-center border border-border text-foreground hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p
        className={cn(
          'font-caption text-xs',
          error ? 'text-destructive-600' : 'text-muted-foreground',
        )}
      >
        {error || t('admin.marketing.combos.form.componentsHint')}
      </p>
    </div>
  );
}
