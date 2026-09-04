'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  BARCODE_TYPES,
  normalizeBarcodeValue,
  validateBarcode,
} from '@/lib/products/barcode';
import type { BarcodeType } from '@/lib/products/types';
import { useEffect, useRef, useState } from 'react';

interface BarcodeFieldProps {
  barcodeType: BarcodeType;
  barcode: string;
  onTypeChange: (type: BarcodeType) => void;
  onBarcodeChange: (value: string) => void;
  idPrefix?: string;
}

export default function BarcodeField({
  barcodeType,
  barcode,
  onTypeChange,
  onBarcodeChange,
  idPrefix = 'barcode',
}: BarcodeFieldProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [preview, setPreview] = useState(false);
  const validation = validateBarcode(barcodeType, barcode);

  useEffect(() => {
    if (!preview || !barcode || !validation.valid || barcodeType === 'Custom') {
      if (svgRef.current) svgRef.current.innerHTML = '';
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        if (cancelled || !svgRef.current) return;
        const format =
          barcodeType === 'UPC'
            ? 'upc'
            : barcodeType === 'EAN'
              ? 'ean13'
              : barcodeType === 'ISBN'
                ? barcode.replace(/[-\s]/g, '').length === 10
                  ? 'CODE128'
                  : 'ean13'
                : 'CODE128';
        svgRef.current.innerHTML = '';
        JsBarcode(svgRef.current, normalizeBarcodeValue(barcodeType, barcode), {
          format,
          displayValue: true,
          fontSize: 12,
          height: 48,
          margin: 4,
        });
      } catch {
        if (svgRef.current) svgRef.current.innerHTML = '';
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preview, barcode, barcodeType, validation.valid]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">Barcode</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_auto]">
        <Select
          value={barcodeType}
          onValueChange={(v) => onTypeChange(v as BarcodeType)}
        >
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BARCODE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={idPrefix}
          value={barcode}
          onChange={(e) => onBarcodeChange(e.target.value)}
          placeholder={
            barcodeType === 'UPC'
              ? '12 digits'
              : barcodeType === 'EAN'
                ? '13 digits'
                : barcodeType === 'ISBN'
                  ? 'ISBN-10 or ISBN-13'
                  : 'Custom value'
          }
          className={
            barcode && !validation.valid ? 'border-destructive-500' : undefined
          }
        />
        <Button
          type="button"
          variant="outline"
          disabled={!barcode || !validation.valid || barcodeType === 'Custom'}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Hide' : 'Preview'}
        </Button>
      </div>
      {barcode && !validation.valid ? (
        <p className="text-sm text-destructive-500">{validation.message}</p>
      ) : null}
      {preview && validation.valid ? (
        <div className="rounded-md border border-border bg-card p-3">
          <svg ref={svgRef} className="mx-auto max-w-full" />
        </div>
      ) : null}
    </div>
  );
}
