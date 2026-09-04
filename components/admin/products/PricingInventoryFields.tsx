'use client';

import BarcodeField from '@/components/admin/products/BarcodeField';
import SkuField from '@/components/admin/products/SkuField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { BarcodeType } from '@/lib/products/types';

export interface PricingInventoryValue {
  price: number;
  comparePrice: number;
  cost?: number;
  sku: string;
  barcodeType: BarcodeType;
  barcode: string;
  trackQuantity: boolean;
  quantity: number;
  lowStockThreshold?: number;
}

interface PricingInventoryFieldsProps {
  value: PricingInventoryValue;
  onChange: (patch: Partial<PricingInventoryValue>) => void;
  productName: string;
  variantValue?: string;
  existingSkus?: string[];
  excludeId?: string;
  excludeVariantId?: string;
  showCost?: boolean;
  showLowStock?: boolean;
  idPrefix?: string;
}

export default function PricingInventoryFields({
  value,
  onChange,
  productName,
  variantValue,
  existingSkus,
  excludeId,
  excludeVariantId,
  showCost = false,
  showLowStock = false,
  idPrefix = 'pi',
}: PricingInventoryFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-price`} className="text-sm font-medium text-muted-foreground">
            Price <span className="text-destructive-500">*</span>
          </Label>
          <Input
            id={`${idPrefix}-price`}
            type="number"
            min={0}
            step="0.01"
            value={value.price || ''}
            onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-compare`} className="text-sm font-medium text-muted-foreground">
            Compare-at Price
          </Label>
          <Input
            id={`${idPrefix}-compare`}
            type="number"
            min={0}
            step="0.01"
            value={value.comparePrice || ''}
            onChange={(e) =>
              onChange({ comparePrice: parseFloat(e.target.value) || 0 })
            }
          />
          {value.comparePrice > 0 && value.comparePrice <= value.price ? (
            <p className="text-xs text-destructive-500">
              Compare-at must be greater than price
            </p>
          ) : null}
        </div>
      </div>

      {showCost ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cost`} className="text-sm font-medium text-muted-foreground">
            Cost (internal)
          </Label>
          <Input
            id={`${idPrefix}-cost`}
            type="number"
            min={0}
            step="0.01"
            value={value.cost || ''}
            onChange={(e) => onChange({ cost: parseFloat(e.target.value) || 0 })}
          />
        </div>
      ) : null}

      <SkuField
        id={`${idPrefix}-sku`}
        sku={value.sku}
        onChange={(sku) => onChange({ sku })}
        productName={productName}
        variantValue={variantValue}
        existingSkus={existingSkus}
        excludeId={excludeId}
        excludeVariantId={excludeVariantId}
      />

      <BarcodeField
        idPrefix={`${idPrefix}-barcode`}
        barcodeType={value.barcodeType}
        barcode={value.barcode}
        onTypeChange={(barcodeType) => onChange({ barcodeType })}
        onBarcodeChange={(barcode) => onChange({ barcode })}
      />

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Track inventory</p>
          <p className="text-xs text-subtle-foreground">Disable for unlimited stock</p>
        </div>
        <Switch
          checked={value.trackQuantity}
          onCheckedChange={(trackQuantity) => onChange({ trackQuantity })}
        />
      </div>

      {value.trackQuantity ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-qty`} className="text-sm font-medium text-muted-foreground">
              Stock quantity
            </Label>
            <Input
              id={`${idPrefix}-qty`}
              type="number"
              min={0}
              value={value.quantity}
              onChange={(e) =>
                onChange({ quantity: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          {showLowStock ? (
            <div className="space-y-2">
              <Label
                htmlFor={`${idPrefix}-low`}
                className="text-sm font-medium text-muted-foreground"
              >
                Low stock threshold
              </Label>
              <Input
                id={`${idPrefix}-low`}
                type="number"
                min={0}
                value={value.lowStockThreshold ?? 10}
                onChange={(e) =>
                  onChange({
                    lowStockThreshold: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
