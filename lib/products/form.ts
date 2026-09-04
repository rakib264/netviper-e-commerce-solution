import { validateBarcode } from '@/lib/products/barcode';
import { coerceDimensionString } from '@/lib/products/measurements';
import { isValidSkuFormat } from '@/lib/products/sku';
import {
  emptyVariant,
  legacyToMedia,
  mediaToLegacy,
  type BarcodeType,
  type MediaItem,
  type ProductVariantForm,
  type SizeVisualizerConfig,
  type VariantMode,
} from '@/lib/products/types';
import * as Yup from 'yup';

export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  editorsNotes: string;
  category: string;
  variantMode: VariantMode;
  price: number;
  comparePrice: number;
  cost: number;
  sku: string;
  barcodeType: BarcodeType;
  barcode: string;
  trackQuantity: boolean;
  quantity: number;
  lowStockThreshold: number;
  thumbnailImage: string;
  media: MediaItem[];
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shippingClass: string;
  taxRate: number;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isLimitedEdition: boolean;
  /** Never counts toward a deal trigger and never receives a deal discount. */
  excludedFromPromotions: boolean;
  /** May be handed out as a free gift or drawn from a mystery box. */
  giftable: boolean;
  /**
   * Return policy. `isReturnable` false blocks a return request outright and
   * `nonReturnableReason` is what the customer is told; `returnWindowDays` of 0
   * means "use the site-wide window".
   */
  isReturnable: boolean;
  nonReturnableReason: string;
  returnWindowDays: number;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  seoKeywords: string[];
  variants: ProductVariantForm[];
  sizeVisualizer: SizeVisualizerConfig;
}

export const defaultSizeVisualizer = (): SizeVisualizerConfig => ({
  enabled: false,
  referenceObjectIds: ['iphone', 'credit-card', 'wine-bottle'],
  bodySilhouetteEnabled: true,
  defaultReferenceId: 'iphone',
  unit: 'cm',
  wearStyle: 'shoulder',
});

export const productFormInitialValues: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  editorsNotes: '',
  category: '',
  variantMode: 'single',
  price: 0,
  comparePrice: 0,
  cost: 0,
  sku: '',
  barcodeType: 'Custom',
  barcode: '',
  trackQuantity: true,
  quantity: 0,
  lowStockThreshold: 10,
  thumbnailImage: '',
  media: [],
  weight: '',
  dimensions: { length: '', width: '', height: '' },
  shippingClass: '',
  taxRate: 0,
  isActive: true,
  isFeatured: false,
  isNewArrival: false,
  isLimitedEdition: false,
  excludedFromPromotions: false,
  giftable: false,
  isReturnable: true,
  nonReturnableReason: '',
  returnWindowDays: 0,
  tags: [],
  metaTitle: '',
  metaDescription: '',
  seoKeywords: [],
  variants: [],
  sizeVisualizer: defaultSizeVisualizer(),
};

export const productFormValidationSchema = Yup.object({
  name: Yup.string().required('Product name is required'),
  slug: Yup.string().required('Product slug is required'),
  description: Yup.string().required('Product description is required'),
  category: Yup.string().required('Please select a category'),
  variantMode: Yup.mixed<'single' | 'multi'>().oneOf(['single', 'multi']).required(),
  price: Yup.number().when('variantMode', {
    is: 'single',
    then: (s) => s.positive('Price must be greater than 0').required(),
    otherwise: (s) => s.min(0),
  }),
  sku: Yup.string().when('variantMode', {
    is: 'single',
    then: (s) =>
      s
        .required('SKU is required')
        .test('sku-format', 'Invalid SKU format', (v) => !!v && isValidSkuFormat(v)),
    otherwise: (s) => s.optional(),
  }),
  barcode: Yup.string().test('barcode', 'Invalid barcode', function (value) {
    const { barcodeType } = this.parent;
    const result = validateBarcode(barcodeType || 'Custom', value || '');
    return result.valid ? true : this.createError({ message: result.message });
  }),
  thumbnailImage: Yup.string().when('variantMode', {
    is: 'single',
    then: (s) => s.required('Thumbnail image is required'),
    otherwise: (s) => s.optional(),
  }),
  media: Yup.array().when('variantMode', {
    is: 'single',
    then: (s) =>
      s.test('has-image', 'Add at least one gallery image', (media: MediaItem[] = []) =>
        media.some((m) => m.type === 'image'),
      ),
    otherwise: (s) => s,
  }),
  variants: Yup.array().when('variantMode', {
    is: 'multi',
    then: (s) =>
      s
        .min(1, 'Add at least one variant')
        .of(
          Yup.object({
            attributeName: Yup.string().required(),
            attributeValue: Yup.string().required('Variant value is required'),
            thumbnailImage: Yup.string().required('Variant thumbnail is required'),
            sku: Yup.string()
              .required('Variant SKU is required')
              .test('sku-format', 'Invalid SKU format', (v) => !!v && isValidSkuFormat(v)),
            price: Yup.number().positive('Variant price must be > 0').required(),
            media: Yup.array().test(
              'variant-images',
              'Each variant needs at least one image',
              (media: MediaItem[] = []) => media.some((m) => m.type === 'image'),
            ),
            barcode: Yup.string().test('vb', 'Invalid barcode', function (value) {
              const { barcodeType } = this.parent;
              const result = validateBarcode(barcodeType || 'Custom', value || '');
              return result.valid ? true : this.createError({ message: result.message });
            }),
          }),
        ),
    otherwise: (s) => s,
  }),
  sizeVisualizer: Yup.object({
    enabled: Yup.boolean(),
    referenceObjectIds: Yup.array().when('enabled', {
      is: true,
      then: (s) => s.min(1, 'Pick at least one reference object').max(3),
      otherwise: (s) => s,
    }),
  }),
});

/** Map API/DB product into form values (handles legacy shape) */
export function productToFormValues(product: any): ProductFormValues {
  const legacyVariants = Array.isArray(product.variants) ? product.variants : [];
  const normalizedVariants: ProductVariantForm[] = legacyVariants.map((v: any) => {
    if (v.attributeName || v.media) {
      return {
        id: v.id || `var_${Math.random().toString(36).slice(2)}`,
        attributeName: v.attributeName || v.name || 'Color',
        attributeValue: v.attributeValue || v.value || '',
        thumbnailImage: v.thumbnailImage || v.image || '',
        media:
          Array.isArray(v.media) && v.media.length
            ? v.media
            : legacyToMedia(v.image ? [v.image] : [], []),
        price: v.price ?? product.price ?? 0,
        comparePrice: v.comparePrice ?? 0,
        sku: v.sku || '',
        barcodeType: v.barcodeType || 'Custom',
        barcode: v.barcode || '',
        trackQuantity: v.trackQuantity !== false,
        quantity: v.quantity ?? 0,
      };
    }
    return {
      ...emptyVariant(v.name || 'Color'),
      attributeName: v.name || 'Color',
      attributeValue: v.value || '',
      thumbnailImage: v.image || '',
      media: v.image ? legacyToMedia([v.image], []) : [],
      price: v.price ?? product.price ?? 0,
      sku: v.sku || '',
      quantity: v.quantity ?? 0,
    };
  });

  const media: MediaItem[] =
    Array.isArray(product.media) && product.media.length
      ? product.media
      : legacyToMedia(product.images || [], product.videoLinks || []);

  const inferredMode: VariantMode =
    product.variantMode ||
    (normalizedVariants.length > 0 ? 'multi' : 'single');

  return {
    ...productFormInitialValues,
    name: product.name || '',
    slug: product.slug || '',
    description: product.description || '',
    shortDescription: product.shortDescription || '',
    editorsNotes: product.editorsNotes || '',
    category:
      typeof product.category === 'object'
        ? product.category?._id || product.category?.slug || ''
        : product.category || '',
    variantMode: inferredMode,
    price: product.price || 0,
    comparePrice: product.comparePrice || 0,
    cost: product.cost || 0,
    sku: product.sku || '',
    barcodeType: product.barcodeType || 'Custom',
    barcode: product.barcode || '',
    trackQuantity: product.trackQuantity !== false,
    quantity: product.quantity || 0,
    lowStockThreshold: product.lowStockThreshold ?? 10,
    thumbnailImage: product.thumbnailImage || '',
    media,
    weight: coerceDimensionString(product.weight),
    dimensions: {
      length: coerceDimensionString(product.dimensions?.length),
      width: coerceDimensionString(product.dimensions?.width),
      height: coerceDimensionString(product.dimensions?.height),
    },
    shippingClass: product.shippingClass || '',
    taxRate: product.taxRate || 0,
    isActive: product.isActive !== false,
    isFeatured: !!product.isFeatured,
    isNewArrival: !!product.isNewArrival,
    isLimitedEdition: !!product.isLimitedEdition,
    excludedFromPromotions: !!product.excludedFromPromotions,
    giftable: !!product.giftable,
    // Absent on products predating the field, and returnable is the safe read.
    isReturnable: product.isReturnable !== false,
    nonReturnableReason: product.nonReturnableReason || '',
    returnWindowDays: Number(product.returnWindowDays) || 0,
    tags: product.tags || [],
    metaTitle: product.metaTitle || '',
    metaDescription: product.metaDescription || '',
    seoKeywords: product.seoKeywords || [],
    variants:
      inferredMode === 'multi' && normalizedVariants.length === 0
        ? [emptyVariant()]
        : normalizedVariants,
    sizeVisualizer: {
      ...defaultSizeVisualizer(),
      ...(product.sizeVisualizer || {}),
      referenceObjectIds:
        product.sizeVisualizer?.referenceObjectIds?.length
          ? product.sizeVisualizer.referenceObjectIds
          : defaultSizeVisualizer().referenceObjectIds,
      // Map from Mongo Map if needed
      scaleOverrides: product.sizeVisualizer?.scaleOverrides
        ? product.sizeVisualizer.scaleOverrides instanceof Map
          ? Object.fromEntries(product.sizeVisualizer.scaleOverrides)
          : product.sizeVisualizer.scaleOverrides
        : undefined,
    },
  };
}

/** Build API payload from form values */
export function formValuesToPayload(values: ProductFormValues) {
  const { images, videoLinks } = mediaToLegacy(values.media);

  if (values.variantMode === 'multi') {
    const first = values.variants[0];
    const firstLegacy = mediaToLegacy(first?.media || []);
    return {
      name: values.name,
      slug: values.slug,
      description: values.description,
      shortDescription: values.shortDescription,
      editorsNotes: values.editorsNotes,
      category: values.category,
      variantMode: 'multi' as const,
      // Product-level mirrors first variant for listings/SEO
      price: first?.price || values.price || 0,
      comparePrice: first?.comparePrice || undefined,
      cost: values.cost || undefined,
      sku: first?.sku || values.sku,
      barcodeType: first?.barcodeType || 'Custom',
      barcode: first?.barcode || undefined,
      trackQuantity: true,
      quantity: values.variants.reduce((sum, v) => sum + (v.quantity || 0), 0),
      lowStockThreshold: values.lowStockThreshold,
      thumbnailImage: first?.thumbnailImage || values.thumbnailImage,
      media: first?.media || [],
      images: firstLegacy.images,
      videoLinks: firstLegacy.videoLinks,
      weight: values.weight?.trim() || undefined,
      dimensions: {
        length: values.dimensions.length?.trim() || '',
        width: values.dimensions.width?.trim() || '',
        height: values.dimensions.height?.trim() || '',
      },
      shippingClass: values.shippingClass || undefined,
      taxRate: values.taxRate || undefined,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      isNewArrival: values.isNewArrival,
      isLimitedEdition: values.isLimitedEdition,
      excludedFromPromotions: values.excludedFromPromotions,
      giftable: values.giftable,
      isReturnable: values.isReturnable,
      // Only meaningful while returns are switched off, and only the window
      // when one was actually entered — otherwise the site default applies.
      nonReturnableReason: values.isReturnable
        ? undefined
        : values.nonReturnableReason || 'custom',
      returnWindowDays: values.returnWindowDays > 0 ? values.returnWindowDays : undefined,
      tags: values.tags,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      seoKeywords: values.seoKeywords,
      sizeVisualizer: values.sizeVisualizer,
      variants: values.variants.map((v) => ({
        id: v.id,
        attributeName: v.attributeName,
        attributeValue: v.attributeValue,
        // legacy mirrors
        name: v.attributeName,
        value: v.attributeValue,
        thumbnailImage: v.thumbnailImage,
        image: v.thumbnailImage,
        media: v.media,
        price: v.price,
        comparePrice: v.comparePrice || undefined,
        sku: v.sku,
        barcodeType: v.barcodeType,
        barcode: v.barcode || undefined,
        trackQuantity: v.trackQuantity,
        quantity: v.quantity,
      })),
      // Clear deprecated fields
      productSize: [],
      sizeImage: '',
      shippingCost: undefined,
    };
  }

  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    shortDescription: values.shortDescription,
    editorsNotes: values.editorsNotes,
    category: values.category,
    variantMode: 'single' as const,
    price: values.price,
    comparePrice: values.comparePrice || undefined,
    cost: values.cost || undefined,
    sku: values.sku,
    barcodeType: values.barcodeType,
    barcode: values.barcode || undefined,
    trackQuantity: values.trackQuantity,
    quantity: values.quantity,
    lowStockThreshold: values.lowStockThreshold,
    thumbnailImage: values.thumbnailImage,
    media: values.media,
    images,
    videoLinks,
    weight: values.weight?.trim() || undefined,
    dimensions: {
      length: values.dimensions.length?.trim() || '',
      width: values.dimensions.width?.trim() || '',
      height: values.dimensions.height?.trim() || '',
    },
    shippingClass: values.shippingClass || undefined,
    taxRate: values.taxRate || undefined,
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    isNewArrival: values.isNewArrival,
    isLimitedEdition: values.isLimitedEdition,
    excludedFromPromotions: values.excludedFromPromotions,
    giftable: values.giftable,
    isReturnable: values.isReturnable,
    nonReturnableReason: values.isReturnable
      ? undefined
      : values.nonReturnableReason || 'custom',
    returnWindowDays: values.returnWindowDays > 0 ? values.returnWindowDays : undefined,
    tags: values.tags,
    metaTitle: values.metaTitle || undefined,
    metaDescription: values.metaDescription || undefined,
    seoKeywords: values.seoKeywords,
    sizeVisualizer: values.sizeVisualizer,
    variants: [],
    productSize: [],
    sizeImage: '',
    shippingCost: undefined,
  };
}
