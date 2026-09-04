'use client';

import ProductVariantPicker, {
  type PickerSelection,
} from '@/components/admin/deals/ProductVariantPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { drawOdds } from '@/lib/deals/rewards';
import { Plus, Trash2 } from 'lucide-react';

export interface PoolEntry {
  productId: string;
  variantId: string | null;
  weight: number;
  /** Kept alongside the saved fields so the row can label itself. */
  label?: string;
  image?: string;
}

/**
 * Weighted mystery-box pool. Weights are relative, so the editor shows the
 * resulting percentage next to each row — an admin should never have to work
 * out what "weight 3 of 11" means to a customer.
 */
export default function WeightedPoolEditor({
  entries,
  onChange,
  error,
}: {
  entries: PoolEntry[];
  onChange: (entries: PoolEntry[]) => void;
  error?: string;
}) {
  const odds = drawOdds(entries);

  const update = (index: number, patch: Partial<PoolEntry>) => {
    onChange(entries.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <p className="border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No products in the pool yet. A completed card cannot open a box until there is
          something to draw.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={`${entry.productId}-${entry.variantId ?? 'base'}-${index}`}
              className="grid items-center gap-2 border border-border bg-card p-3 sm:grid-cols-[1fr_7rem_4.5rem_2.5rem]"
            >
              <ProductVariantPicker
                value={
                  entry.productId
                    ? {
                        productId: entry.productId,
                        variantId: entry.variantId,
                        label: entry.label,
                        image: entry.image,
                      }
                    : null
                }
                onChange={(selection: PickerSelection | null) =>
                  update(index, {
                    productId: selection?.productId ?? '',
                    variantId: selection?.variantId ?? null,
                    label: selection?.label,
                    image: selection?.image,
                  })
                }
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Weight</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={entry.weight}
                  onChange={(event) => update(index, { weight: Number(event.target.value) })}
                  aria-label="Draw weight"
                />
              </div>

              <span className="text-right text-sm font-medium tabular-nums text-foreground">
                {odds[index] === null ? '—' : `${(odds[index] as number).toFixed(1)}%`}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Remove from pool"
                onClick={() => onChange(entries.filter((_, position) => position !== index))}
                className="text-destructive-600 hover:bg-destructive-50 hover:text-destructive-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive-600">{error}</p>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...entries, { productId: '', variantId: null, weight: 1 }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add product
      </Button>
    </div>
  );
}
