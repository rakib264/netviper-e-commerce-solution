import { validateBarcode } from '@/lib/products/barcode';
import { isValidSkuFormat } from '@/lib/products/sku';

export function validateProductPayload(data: any): string[] {
  const errors: string[] = [];
  const mode = data.variantMode === 'multi' ? 'multi' : 'single';

  if (!data.name || String(data.name).trim().length === 0) {
    errors.push('Product name is required');
  }
  if (!data.slug || String(data.slug).trim().length === 0) {
    errors.push('Product slug is required');
  }
  if (!data.description || String(data.description).trim().length === 0) {
    errors.push('Product description is required');
  }
  if (!data.category) {
    errors.push('Product category is required');
  }

  if (mode === 'single') {
    if (!data.price || data.price <= 0) {
      errors.push('Product price must be greater than 0');
    }
    if (!data.sku || String(data.sku).trim().length === 0) {
      errors.push('Product SKU is required');
    } else if (!isValidSkuFormat(data.sku)) {
      errors.push('Invalid SKU format');
    }
    if (!data.thumbnailImage || String(data.thumbnailImage).trim().length === 0) {
      errors.push('Product thumbnail image is required');
    }
    const media = Array.isArray(data.media) ? data.media : [];
    const images = Array.isArray(data.images) ? data.images : [];
    const hasImage =
      media.some((m: any) => m?.type === 'image' && m?.url) || images.length > 0;
    if (!hasImage) {
      errors.push('Add at least one gallery image');
    }
    if (data.comparePrice && data.comparePrice <= data.price) {
      errors.push('Compare price must be greater than regular price');
    }
    if (data.cost && data.cost > data.price) {
      errors.push('Cost cannot be greater than selling price');
    }
    if (data.trackQuantity && (data.quantity === undefined || data.quantity < 0)) {
      errors.push('Quantity must be 0 or greater when tracking quantity');
    }
    const barcodeCheck = validateBarcode(
      data.barcodeType || 'Custom',
      data.barcode || '',
    );
    if (!barcodeCheck.valid) {
      errors.push(barcodeCheck.message || 'Invalid barcode');
    }
  } else {
    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      errors.push('Add at least one variant');
    } else {
      const skus = new Set<string>();
      data.variants.forEach((variant: any, i: number) => {
        const label = `Variant ${i + 1}`;
        if (!variant.attributeValue && !variant.value) {
          errors.push(`${label}: value is required`);
        }
        if (!variant.thumbnailImage && !variant.image) {
          errors.push(`${label}: thumbnail is required`);
        }
        const media = Array.isArray(variant.media) ? variant.media : [];
        if (!media.some((m: any) => m?.type === 'image' && m?.url)) {
          errors.push(`${label}: at least one gallery image is required`);
        }
        if (!variant.price || variant.price <= 0) {
          errors.push(`${label}: price must be greater than 0`);
        }
        if (!variant.sku || !isValidSkuFormat(variant.sku)) {
          errors.push(`${label}: valid SKU is required`);
        } else if (skus.has(variant.sku)) {
          errors.push(`${label}: duplicate SKU in payload`);
        } else {
          skus.add(variant.sku);
        }
        const barcodeCheck = validateBarcode(
          variant.barcodeType || 'Custom',
          variant.barcode || '',
        );
        if (!barcodeCheck.valid) {
          errors.push(`${label}: ${barcodeCheck.message || 'Invalid barcode'}`);
        }
      });
    }
  }

  if (data.sizeVisualizer?.enabled) {
    const refs = data.sizeVisualizer.referenceObjectIds || [];
    if (!refs.length || refs.length > 3) {
      errors.push('Size visualizer requires 1–3 reference objects');
    }
  }

  return errors;
}
