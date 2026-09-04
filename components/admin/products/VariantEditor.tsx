'use client';

import FileUpload from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MediaGalleryEditor from '@/components/admin/products/MediaGalleryEditor';
import PricingInventoryFields from '@/components/admin/products/PricingInventoryFields';
import {
  emptyVariant,
  type ProductVariantForm,
} from '@/lib/products/types';
import { Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';

const ATTRIBUTE_PRESETS = ['Color', 'Type', 'Material', 'Finish', 'Custom'];

interface VariantEditorProps {
  variants: ProductVariantForm[];
  onChange: (variants: ProductVariantForm[]) => void;
  productName: string;
  excludeProductId?: string;
  errors?: Record<string, string>;
}

export default function VariantEditor({
  variants,
  onChange,
  productName,
  excludeProductId,
  errors = {},
}: VariantEditorProps) {
  const allSkus = variants.map((v) => v.sku).filter(Boolean);

  const update = (index: number, patch: Partial<ProductVariantForm>) => {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const add = () => {
    const attr =
      variants[0]?.attributeName || 'Color';
    onChange([...variants, emptyVariant(attr)]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Variants</h3>
          <p className="text-xs text-subtle-foreground">
            Each variant needs its own thumbnail, gallery (with images), price, and SKU.
          </p>
        </div>
        <Button type="button" onClick={add} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add variant
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-subtle-foreground">
          No variants yet. Add at least one to publish in Multi mode.
        </div>
      ) : null}

      {variants.map((variant, index) => {
        const imageCount = variant.media.filter((m) => m.type === 'image').length;
        const mediaError =
          !variant.thumbnailImage && imageCount === 0
            ? 'Thumbnail or at least one gallery image is required'
            : imageCount === 0 && !variant.media.some((m) => m.type === 'image')
              ? 'At least one image is required before publishing'
              : undefined;
        const hasImage =
          Boolean(variant.thumbnailImage) ||
          variant.media.some((m) => m.type === 'image');

        return (
          <Card key={variant.id} className="border-border">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <CardTitle className="text-base">
                Variant {index + 1}
                {variant.attributeValue ? ` · ${variant.attributeValue}` : ''}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive-600 hover:text-destructive-700"
                onClick={() => remove(index)}
                disabled={variants.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Attribute</Label>
                  <Select
                    value={
                      ATTRIBUTE_PRESETS.includes(variant.attributeName)
                        ? variant.attributeName
                        : 'Custom'
                    }
                    onValueChange={(v) => {
                      if (v === 'Custom') {
                        update(index, { attributeName: variant.attributeName || 'Custom' });
                      } else {
                        update(index, { attributeName: v });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTE_PRESETS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(variant.attributeName === 'Custom' ||
                    !ATTRIBUTE_PRESETS.includes(variant.attributeName)) && (
                    <Input
                      value={variant.attributeName}
                      onChange={(e) =>
                        update(index, { attributeName: e.target.value })
                      }
                      placeholder="Custom attribute name"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Value <span className="text-destructive-500">*</span>
                  </Label>
                  <Input
                    value={variant.attributeValue}
                    onChange={(e) =>
                      update(index, { attributeValue: e.target.value })
                    }
                    placeholder="e.g. Olive Green"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Thumbnail <span className="text-destructive-500">*</span>
                </Label>
                <FileUpload
                  onUpload={(url) => update(index, { thumbnailImage: url })}
                />
                {variant.thumbnailImage ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded border">
                    <Image
                      src={variant.thumbnailImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : null}
              </div>

              <MediaGalleryEditor
                media={variant.media}
                onChange={(media) => update(index, { media })}
                label="Variant gallery"
                required
                error={
                  !hasImage
                    ? 'Block publishing: add at least one image to this variant'
                    : errors[`variants.${index}.media`]
                }
              />

              <PricingInventoryFields
                idPrefix={`variant-${variant.id}`}
                productName={productName}
                variantValue={variant.attributeValue}
                existingSkus={allSkus}
                excludeId={excludeProductId}
                excludeVariantId={variant.id}
                value={{
                  price: variant.price,
                  comparePrice: variant.comparePrice,
                  sku: variant.sku,
                  barcodeType: variant.barcodeType,
                  barcode: variant.barcode,
                  trackQuantity: variant.trackQuantity,
                  quantity: variant.quantity,
                }}
                onChange={(patch) => update(index, patch)}
              />

              {mediaError && !hasImage ? (
                <p className="text-sm text-warning-600">{mediaError}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
