'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { suggestSku, isValidSkuFormat } from '@/lib/products/sku';
import {
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader } from '@/components/ui/loader';

interface SkuFieldProps {
  sku: string;
  onChange: (sku: string) => void;
  productName: string;
  variantValue?: string;
  existingSkus?: string[];
  excludeId?: string;
  excludeVariantId?: string;
  required?: boolean;
  id?: string;
}

type SkuStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function SkuField({
  sku,
  onChange,
  productName,
  variantValue,
  existingSkus = [],
  excludeId,
  excludeVariantId,
  required = true,
  id = 'sku',
}: SkuFieldProps) {
  const [status, setStatus] = useState<SkuStatus>('idle');
  const [message, setMessage] = useState('');
  const debouncedSku = useDebounce(sku, 400);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const value = (debouncedSku || '').trim();
      if (!value) {
        setStatus('idle');
        setMessage('');
        return;
      }
      if (!isValidSkuFormat(value)) {
        setStatus('invalid');
        setMessage('Invalid format');
        return;
      }
      if (
        existingSkus.filter((s) => s === value).length >
        (excludeVariantId || excludeId ? 0 : 0)
      ) {
        // Client-side duplicate within form
        const dupes = existingSkus.filter((s) => s.toLowerCase() === value.toLowerCase());
        if (dupes.length > 1 || (dupes.length === 1 && !sku)) {
          // handled below via API too
        }
      }

      // Local form duplicates (other fields currently edited)
      const localCount = existingSkus.filter(
        (s) => s.trim().toLowerCase() === value.toLowerCase(),
      ).length;
      if (localCount > 1) {
        setStatus('taken');
        setMessage('Duplicate SKU in this form');
        return;
      }

      setStatus('checking');
      try {
        const params = new URLSearchParams({ sku: value });
        if (excludeId) params.set('excludeId', excludeId);
        if (excludeVariantId) params.set('excludeVariantId', excludeVariantId);
        const res = await fetch(`/api/admin/products/check-sku?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.available) {
          setStatus('available');
          setMessage('Available');
        } else {
          setStatus('taken');
          setMessage(data.error || 'Already taken');
        }
      } catch {
        if (!cancelled) {
          setStatus('idle');
          setMessage('');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSku, excludeId, excludeVariantId, existingSkus, sku]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
          SKU{required ? <span className="text-destructive-500"> *</span> : null}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onChange(suggestSku(productName, variantValue, existingSkus.filter((s) => s !== sku)))
          }
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Suggest
        </Button>
      </div>
      <div className="relative">
        <Input
          id={id}
          value={sku}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="e.g. TABBY-20-OLIVE"
          className={
            status === 'taken' || status === 'invalid'
              ? 'border-destructive-500 pr-9'
              : status === 'available'
                ? 'border-success-500 pr-9'
                : 'pr-9'
          }
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle-foreground">
          {status === 'checking' ? (
            <Loader size="sm" label={null} />
          ) : status === 'available' ? (
            <Check className="h-4 w-4 text-success-600" />
          ) : status === 'taken' || status === 'invalid' ? (
            <X className="h-4 w-4 text-destructive-500" />
          ) : null}
        </span>
      </div>
      {message ? (
        <p
          className={`text-xs ${
            status === 'available' ? 'text-success-600' : 'text-destructive-500'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
