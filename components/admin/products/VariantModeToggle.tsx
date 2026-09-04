'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { VariantMode } from '@/lib/products/types';

interface VariantModeToggleProps {
  value: VariantMode;
  onChange: (mode: VariantMode) => void;
  disabled?: boolean;
}

export default function VariantModeToggle({
  value,
  onChange,
  disabled,
}: VariantModeToggleProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">Variant Mode</Label>
      <div className="inline-flex rounded-lg border border-border bg-muted p-1">
        {(
          [
            { id: 'single', label: 'Single Variant', hint: 'One SKU, one gallery' },
            { id: 'multi', label: 'Multi Variant', hint: 'Per-color galleries & SKUs' },
          ] as const
        ).map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={cn(
                'rounded-md px-4 py-2 text-left transition-all',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-subtle-foreground hover:text-foreground',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs font-caption text-subtle-foreground">{option.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-subtle-foreground">
        Switching modes keeps your data. In Multi mode, media lives on each variant.
      </p>
    </div>
  );
}
