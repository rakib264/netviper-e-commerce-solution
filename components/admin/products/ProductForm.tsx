'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import MediaGalleryEditor from '@/components/admin/products/MediaGalleryEditor';
import PricingInventoryFields from '@/components/admin/products/PricingInventoryFields';
import SizeVisualizerConfigForm from '@/components/admin/products/SizeVisualizerConfigForm';
import VariantEditor from '@/components/admin/products/VariantEditor';
import VariantModeToggle from '@/components/admin/products/VariantModeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToastWithTypes } from '@/hooks/use-toast';
import {
  formValuesToPayload,
  productFormInitialValues,
  productFormValidationSchema,
  productToFormValues,
  type ProductFormValues,
} from '@/lib/products/form';
import { emptyVariant, type VariantMode } from '@/lib/products/types';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import {
  DEFAULT_RETURN_WINDOW_DAYS,
  NON_RETURNABLE_REASONS,
} from '@/lib/returns/policy';

interface Category {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface ShippingClass {
  id: string;
  name: string;
  description?: string;
}

function AutosaveWatcher({
  values,
  onChange,
}: {
  values: ProductFormValues;
  onChange: (values: ProductFormValues) => void;
}) {
  useEffect(() => {
    onChange(values);
  }, [values, onChange]);
  return null;
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initialProduct?: any;
}

const AUTOSAVE_KEY_NEW = 'mascari:product-draft:new';

export default function ProductForm({
  mode,
  productId,
  initialProduct,
}: ProductFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { success, error, info } = useToastWithTypes();
  const [categories, setCategories] = useState<Category[]>([]);
  const [shippingClasses, setShippingClasses] = useState<ShippingClass[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialValues = useMemo(() => {
    if (mode === 'edit' && initialProduct) {
      return productToFormValues(initialProduct);
    }
    if (typeof window !== 'undefined' && mode === 'create') {
      try {
        const raw = localStorage.getItem(AUTOSAVE_KEY_NEW);
        if (raw) return { ...productFormInitialValues, ...JSON.parse(raw) };
      } catch {
        /* ignore */
      }
    }
    return productFormInitialValues;
  }, [mode, initialProduct]);

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, courierRes] = await Promise.all([
          fetch('/api/categories?active=true'),
          fetch('/api/admin/settings/courier').catch(() => null),
        ]);
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(Array.isArray(data?.categories) ? data.categories : []);
        }
        if (courierRes && courierRes.ok) {
          const data = await courierRes.json();
          const classes =
            data?.shippingClasses ||
            data?.settings?.shippingClasses ||
            [];
          if (Array.isArray(classes) && classes.length) {
            setShippingClasses(classes);
          } else {
            setShippingClasses([
              { id: 'standard', name: 'Standard' },
              { id: 'fragile', name: 'Fragile' },
              { id: 'oversized', name: 'Oversized' },
            ]);
          }
        } else {
          setShippingClasses([
            { id: 'standard', name: 'Standard' },
            { id: 'fragile', name: 'Fragile' },
            { id: 'oversized', name: 'Oversized' },
          ]);
        }
      } catch {
        error('Failed to load form data', 'Please refresh and try again.');
      } finally {
        setCategoriesLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const scheduleAutosave = useCallback(
    (values: ProductFormValues) => {
      if (mode !== 'create') return;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(AUTOSAVE_KEY_NEW, JSON.stringify(values));
          setAutosaveAt(new Date().toLocaleTimeString());
        } catch {
          /* ignore quota */
        }
      }, 800);
    },
    [mode],
  );

  const handleVariantModeChange = (
    next: VariantMode,
    values: ProductFormValues,
    setFieldValue: (f: string, v: unknown) => void,
  ) => {
    setFieldValue('variantMode', next);
    if (next === 'multi' && values.variants.length === 0) {
      setFieldValue('variants', [
        emptyVariant('Color', {
          price: values.price,
          comparePrice: values.comparePrice,
          sku: values.sku,
          barcodeType: values.barcodeType,
          barcode: values.barcode,
          trackQuantity: values.trackQuantity,
          quantity: values.quantity,
          thumbnailImage: values.thumbnailImage,
          media: values.media,
        }),
      ]);
    }
    info(
      next === 'multi' ? 'Multi variant mode' : 'Single variant mode',
      'Your existing data was preserved.',
    );
  };

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitting(true);
    try {
      const payload = formValuesToPayload(values);
      const url =
        mode === 'create'
          ? '/api/admin/products'
          : `/api/admin/products/${productId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const details = Array.isArray(data.details)
          ? data.details.join(', ')
          : data.error || 'Save failed';
        error('Validation failed', details);
        return;
      }
      if (mode === 'create') {
        localStorage.removeItem(AUTOSAVE_KEY_NEW);
      }
      success(
        mode === 'create' ? 'Product created' : 'Product updated',
        values.name,
      );
      const id = mode === 'create' ? data.product?._id : productId;
      router.push(id ? `/admin/products/${id}` : '/admin/products');
    } catch (err: any) {
      error('Save failed', err?.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {mode === 'create' ? 'Add Product' : 'Edit Product'}
              </h1>
              {autosaveAt ? (
                <p className="text-xs text-subtle-foreground">Draft saved at {autosaveAt}</p>
              ) : null}
            </div>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={productFormValidationSchema}
          onSubmit={onSubmit}
        >
          {({ values, setFieldValue, errors, touched }) => {
            const allSkus =
              values.variantMode === 'multi'
                ? values.variants.map((v) => v.sku)
                : [values.sku];

            return (
              <Form className="space-y-6">
                <AutosaveWatcher values={values} onChange={scheduleAutosave} />
                {/* General Info */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>General Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">
                            Name <span className="text-destructive-500">*</span>
                          </Label>
                          <Field
                            as={Input}
                            id="name"
                            name="name"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setFieldValue('name', e.target.value);
                              if (mode === 'create' || !touched.slug) {
                                setFieldValue('slug', generateSlug(e.target.value));
                              }
                            }}
                          />
                          <ErrorMessage
                            name="name"
                            component="p"
                            className="text-sm text-destructive-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug">
                            Slug <span className="text-destructive-500">*</span>
                          </Label>
                          <Field as={Input} id="slug" name="slug" />
                          <ErrorMessage
                            name="slug"
                            component="p"
                            className="text-sm text-destructive-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Category <span className="text-destructive-500">*</span></Label>
                        <Select
                          value={values.category}
                          onValueChange={(v) => setFieldValue('category', v)}
                          disabled={categoriesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ErrorMessage
                          name="category"
                          component="p"
                          className="text-sm text-destructive-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Short description</Label>
                        <Field
                          as={Textarea}
                          name="shortDescription"
                          rows={2}
                          placeholder="One-line summary for listings"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Description <span className="text-destructive-500">*</span>
                        </Label>
                        <RichTextEditor
                          value={values.description}
                          onChange={(v) => setFieldValue('description', v)}
                          placeholder="Full product description"
                        />
                        <ErrorMessage
                          name="description"
                          component="p"
                          className="text-sm text-destructive-500"
                        />
                      </div>

                      <div className="flex flex-wrap gap-6">
                        {(
                          [
                            ['isActive', 'Active'],
                            ['isFeatured', 'Featured'],
                            ['isNewArrival', 'New arrival'],
                            ['isLimitedEdition', 'Limited edition'],
                            ['giftable', 'Giftable'],
                            ['excludedFromPromotions', 'Excluded from promotions'],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={values[key]}
                              onCheckedChange={(c) => setFieldValue(key, c)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      {/*
                        Return policy. Kept beside the other product flags
                        rather than on its own tab: whether an item can come
                        back is a property of the item, and the person deciding
                        it is already here.
                      */}
                      <div className="space-y-4 rounded-lg border border-border p-4">
                        <div>
                          <p className="typography-label text-hierarchy-label">
                            {t('admin.products.returnPolicy.title')}
                          </p>
                          <p className="typography-micro text-muted-foreground">
                            {t('admin.products.returnPolicy.description')}
                          </p>
                        </div>

                        <label className="flex items-start gap-3 text-sm">
                          <Switch
                            checked={values.isReturnable}
                            onCheckedChange={(checked) => {
                              setFieldValue('isReturnable', checked);
                              // Clearing the reason on re-enable stops a stale
                              // explanation being persisted for a returnable item.
                              if (checked) setFieldValue('nonReturnableReason', '');
                            }}
                          />
                          <span>
                            {t('admin.products.returnPolicy.isReturnable')}
                            <span className="block typography-micro text-muted-foreground">
                              {t('admin.products.returnPolicy.isReturnableHelp')}
                            </span>
                          </span>
                        </label>

                        {!values.isReturnable && (
                          <div className="space-y-2">
                            <Label>
                              {t('admin.products.returnPolicy.reasonLabel')}
                            </Label>
                            <Select
                              value={values.nonReturnableReason || undefined}
                              onValueChange={(value) =>
                                setFieldValue('nonReturnableReason', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t(
                                    'admin.products.returnPolicy.reasonPlaceholder',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {NON_RETURNABLE_REASONS.map((reason) => (
                                  <SelectItem key={reason} value={reason}>
                                    {t(`admin.products.returnPolicy.reasons.${reason}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="typography-micro text-muted-foreground">
                              {t('admin.products.returnPolicy.reasonHelp')}
                            </p>
                          </div>
                        )}

                        {values.isReturnable && (
                          <div className="space-y-2">
                            <Label>
                              {t('admin.products.returnPolicy.windowLabel')}
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={values.returnWindowDays || ''}
                              placeholder={t(
                                'admin.products.returnPolicy.windowPlaceholder',
                              )}
                              onChange={(event) =>
                                setFieldValue(
                                  'returnWindowDays',
                                  Number(event.target.value) || 0,
                                )
                              }
                            />
                            <p className="typography-micro text-muted-foreground">
                              {t('admin.products.returnPolicy.windowHelp', {
                                days: DEFAULT_RETURN_WINDOW_DAYS,
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Variant toggle */}
                <Card>
                  <CardHeader>
                    <CardTitle>Variants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VariantModeToggle
                      value={values.variantMode}
                      onChange={(m) =>
                        handleVariantModeChange(m, values, setFieldValue)
                      }
                    />
                  </CardContent>
                </Card>

                {/* Media & Variants */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {values.variantMode === 'single'
                        ? 'Media'
                        : 'Media & Variants'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {values.variantMode === 'single' ? (
                      <>
                        <div className="space-y-2">
                          <Label>
                            Thumbnail <span className="text-destructive-500">*</span>
                          </Label>
                          <FileUpload
                            onUpload={(url) => setFieldValue('thumbnailImage', url)}
                          />
                          {values.thumbnailImage ? (
                            <div className="relative h-28 w-28 overflow-hidden rounded border">
                              <Image
                                src={values.thumbnailImage}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="112px"
                              />
                            </div>
                          ) : null}
                          <ErrorMessage
                            name="thumbnailImage"
                            component="p"
                            className="text-sm text-destructive-500"
                          />
                        </div>
                        <MediaGalleryEditor
                          media={values.media}
                          onChange={(media) => setFieldValue('media', media)}
                          required
                          error={
                            typeof errors.media === 'string' ? errors.media : undefined
                          }
                        />
                      </>
                    ) : (
                      <VariantEditor
                        variants={values.variants}
                        onChange={(variants) => setFieldValue('variants', variants)}
                        productName={values.name}
                        excludeProductId={productId}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Pricing & Inventory (single only — multi is per variant) */}
                {values.variantMode === 'single' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Pricing & Inventory</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PricingInventoryFields
                        showCost
                        showLowStock
                        productName={values.name}
                        existingSkus={allSkus}
                        excludeId={productId}
                        value={{
                          price: values.price,
                          comparePrice: values.comparePrice,
                          cost: values.cost,
                          sku: values.sku,
                          barcodeType: values.barcodeType,
                          barcode: values.barcode,
                          trackQuantity: values.trackQuantity,
                          quantity: values.quantity,
                          lowStockThreshold: values.lowStockThreshold,
                        }}
                        onChange={(patch) => {
                          Object.entries(patch).forEach(([k, v]) =>
                            setFieldValue(k, v),
                          );
                        }}
                      />
                    </CardContent>
                  </Card>
                ) : null}

                {/* Measurements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Measurements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-subtle-foreground">
                      Freeform measurements (include units). Example: 10.25&quot;, 5.5&quot;, 3.25&quot;.
                      Shipping rates live in Settings → Courier.
                    </p>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {(
                        [
                          ['dimensions.length', 'Length', values.dimensions.length, 'e.g. 10.25"'],
                          ['dimensions.width', 'Width', values.dimensions.width, 'e.g. 3.25"'],
                          ['dimensions.height', 'Height', values.dimensions.height, 'e.g. 5.5"'],
                          ['weight', 'Weight', values.weight, 'e.g. 1.2 lb'],
                        ] as const
                      ).map(([name, label, val, placeholder]) => (
                        <div key={name} className="space-y-2">
                          <Label>{label}</Label>
                          <Input
                            type="text"
                            inputMode="text"
                            value={val || ''}
                            placeholder={placeholder}
                            onChange={(e) => setFieldValue(name, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Shipping class</Label>
                      <Select
                        value={values.shippingClass || 'none'}
                        onValueChange={(v) =>
                          setFieldValue('shippingClass', v === 'none' ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {shippingClasses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                              {c.description ? ` — ${c.description}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-subtle-foreground">
                        Classes are managed in Settings → Courier / Shipping.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Size Visualizer */}
                <Card>
                  <CardHeader>
                    <CardTitle>Size & Fit Visualizer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SizeVisualizerConfigForm
                      value={values.sizeVisualizer}
                      onChange={(v) => setFieldValue('sizeVisualizer', v)}
                      dimensions={values.dimensions}
                      productName={values.name || 'Product'}
                      productImage={
                        values.thumbnailImage ||
                        values.media.find((m) => m.type === 'image')?.url ||
                        values.variants[0]?.thumbnailImage ||
                        values.variants[0]?.media?.find((m) => m.type === 'image')?.url
                      }
                    />
                  </CardContent>
                </Card>

                {/* SEO */}
                <Card>
                  <CardHeader>
                    <CardTitle>SEO</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Meta title</Label>
                      <Field as={Input} name="metaTitle" />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta description</Label>
                      <Field as={Textarea} name="metaDescription" rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const t = tagInput.trim();
                              if (t && !values.tags.includes(t)) {
                                setFieldValue('tags', [...values.tags, t]);
                              }
                              setTagInput('');
                            }
                          }}
                          placeholder="Add tag and press Enter"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const t = tagInput.trim();
                            if (t && !values.tags.includes(t)) {
                              setFieldValue('tags', [...values.tags, t]);
                            }
                            setTagInput('');
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {values.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setFieldValue(
                                  'tags',
                                  values.tags.filter((t) => t !== tag),
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>SEO keywords</Label>
                      <div className="flex gap-2">
                        <Input
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const t = keywordInput.trim();
                              if (t && !values.seoKeywords.includes(t)) {
                                setFieldValue('seoKeywords', [
                                  ...values.seoKeywords,
                                  t,
                                ]);
                              }
                              setKeywordInput('');
                            }
                          }}
                          placeholder="Add keyword and press Enter"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const t = keywordInput.trim();
                            if (t && !values.seoKeywords.includes(t)) {
                              setFieldValue('seoKeywords', [
                                ...values.seoKeywords,
                                t,
                              ]);
                            }
                            setKeywordInput('');
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {values.seoKeywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="gap-1">
                            {kw}
                            <button
                              type="button"
                              onClick={() =>
                                setFieldValue(
                                  'seoKeywords',
                                  values.seoKeywords.filter((k) => k !== kw),
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Editor's Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Editor&apos;s Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RichTextEditor
                      value={values.editorsNotes}
                      onChange={(v) => setFieldValue('editorsNotes', v)}
                      placeholder="Storytelling copy shown on the product page…"
                    />
                  </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-3 pb-10">
                  <Link href="/admin/products">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={submitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {submitting
                      ? 'Saving…'
                      : mode === 'create'
                        ? 'Create product'
                        : 'Save changes'}
                  </Button>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>
    </AdminLayout>
  );
}
