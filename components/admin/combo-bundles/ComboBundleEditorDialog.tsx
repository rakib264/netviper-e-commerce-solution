'use client';

import ComboComponentPicker, {
  draftFromProduct,
  type ComboComponentDraft,
} from '@/components/admin/combo-bundles/ComboComponentPicker';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import DateTimePicker from '@/components/ui/datetime-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FileUpload from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToastWithTypes } from '@/hooks/use-toast';
import {
  MAX_COMPONENTS,
  MIN_COMPONENTS,
  comboSlugify,
  computeComboSavings,
  deriveComboType,
  sumComponentListPrices,
  type ResolvedComboBundle,
} from '@/lib/combo-bundles/types';
import { formatEuroCurrency } from '@/lib/utils';
import { Formik, type FormikHelpers } from 'formik';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';

interface FormValues {
  name: string;
  slug: string;
  description: string;
  badgeText: string;
  price: string;
  compareAtPrice: string;
  isActive: boolean;
  isFeatured: boolean;
  startsAt: Date | undefined;
  endsAt: Date | undefined;
}

export interface ComboBundleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combo: ResolvedComboBundle | null;
  onSaved: () => void;
}

/**
 * Create / edit one combo or bundle.
 *
 * The type is never asked for: it follows the component count, and the header
 * says which the offer currently is so an admin adding a third product can see
 * it become a bundle as they do it. The saving is previewed live against the
 * components' own list prices — the same sum the storefront will strike
 * through — so a fixed price can be chosen with the number in view.
 */
export default function ComboBundleEditorDialog({
  open,
  onOpenChange,
  combo,
  onSaved,
}: ComboBundleEditorDialogProps) {
  const { t } = useTranslation();
  const { success, error } = useToastWithTypes();

  const [components, setComponents] = useState<ComboComponentDraft[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [componentError, setComponentError] = useState<string | undefined>();
  const [hydrating, setHydrating] = useState(false);

  /*
   * Editing hydrates the component rows from the resolved offer, which already
   * carries each component's live price, stock and variant label — so the
   * editor never has to re-derive them and can never disagree with what the
   * storefront shows.
   */
  useEffect(() => {
    if (!open) return;

    setComponentError(undefined);

    if (!combo) {
      setComponents([]);
      setImages([]);
      return;
    }

    setImages(combo.images || []);
    setHydrating(true);
    setComponents(
      combo.components.map((component) => ({
        productId: component.productId,
        variantId: component.variantId,
        qty: component.qty,
        name: component.variantLabel
          ? `${component.name} (${component.variantLabel})`
          : component.name,
        image: component.image,
        unitPrice: component.unitPrice,
        available: component.available,
        variants: [],
      })),
    );
    setHydrating(false);
  }, [open, combo]);

  const listTotal = useMemo(
    () => sumComponentListPrices(components),
    [components],
  );

  const initialValues: FormValues = {
    name: combo?.name || '',
    slug: combo?.slug || '',
    description: combo?.description || '',
    badgeText: combo?.badgeText || '',
    price: combo ? String(combo.price) : '',
    // Only a genuine override is shown; a computed compare-at stays blank so
    // it keeps following the components.
    compareAtPrice:
      combo && combo.compareAtPrice && combo.compareAtPrice !== listTotal
        ? String(combo.compareAtPrice)
        : '',
    isActive: combo ? combo.isActive : true,
    isFeatured: combo ? combo.isFeatured : false,
    startsAt: combo?.startsAt ? new Date(combo.startsAt) : undefined,
    endsAt: combo?.endsAt ? new Date(combo.endsAt) : undefined,
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required(t('admin.marketing.combos.errors.name'))
      .max(160, t('admin.marketing.combos.errors.nameLong')),
    slug: Yup.string()
      .trim()
      .matches(/^[a-z0-9-]*$/, t('admin.marketing.combos.errors.slug')),
    price: Yup.number()
      .typeError(t('admin.marketing.combos.errors.price'))
      .moreThan(0, t('admin.marketing.combos.errors.price'))
      .required(t('admin.marketing.combos.errors.price')),
    compareAtPrice: Yup.number()
      .typeError(t('admin.marketing.combos.errors.compareAt'))
      .min(0, t('admin.marketing.combos.errors.compareAt'))
      .nullable()
      .transform((value, original) => (original === '' ? 0 : value)),
    endsAt: Yup.date()
      .nullable()
      .test(
        'after-start',
        t('admin.marketing.combos.errors.endBeforeStart'),
        function (value) {
          const { startsAt } = this.parent as FormValues;
          if (!value || !startsAt) return true;
          return value.getTime() > startsAt.getTime();
        },
      ),
  });

  const handleSubmit = async (
    values: FormValues,
    helpers: FormikHelpers<FormValues>,
  ) => {
    if (components.length < MIN_COMPONENTS) {
      setComponentError(
        t('admin.marketing.combos.errors.components', { count: MIN_COMPONENTS }),
      );
      helpers.setSubmitting(false);
      return;
    }
    setComponentError(undefined);

    const payload = {
      name: values.name.trim(),
      slug: comboSlugify(values.slug || values.name),
      description: values.description.trim(),
      badgeText: values.badgeText.trim(),
      images,
      components: components.map((component, index) => ({
        productId: component.productId,
        variantId: component.variantId,
        qty: component.qty,
        sortOrder: index,
      })),
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : 0,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      startsAt: values.startsAt ? values.startsAt.toISOString() : null,
      endsAt: values.endsAt ? values.endsAt.toISOString() : null,
    };

    try {
      const response = await fetch(
        combo
          ? `/api/admin/combo-bundles/${combo._id}`
          : '/api/admin/combo-bundles',
        {
          method: combo ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        error(
          t('admin.marketing.combos.toasts.saveFailedTitle'),
          Array.isArray(data.details)
            ? data.details.join(', ')
            : data.error || t('admin.marketing.combos.toasts.saveFailedBody'),
        );
        return;
      }

      success(
        combo
          ? t('admin.marketing.combos.toasts.updatedTitle')
          : t('admin.marketing.combos.toasts.createdTitle'),
        combo
          ? t('admin.marketing.combos.toasts.updatedBody')
          : t('admin.marketing.combos.toasts.createdBody'),
      );
      onOpenChange(false);
      onSaved();
    } catch {
      error(
        t('admin.marketing.combos.toasts.saveFailedTitle'),
        t('admin.marketing.combos.toasts.saveFailedBody'),
      );
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const comboType = deriveComboType(components.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            {combo
              ? t('admin.marketing.combos.dialog.editTitle')
              : t('admin.marketing.combos.dialog.createTitle')}
            {/* The derived type, in the header, so it is impossible to miss the
                moment a third product turns a combo into a bundle. */}
            <span className="border border-border px-2 py-0.5 font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t(
                comboType === 'bundle'
                  ? 'admin.marketing.combos.type.bundle'
                  : 'admin.marketing.combos.type.combo',
              )}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSubmit}
        >
          {(formik) => {
            const priceValue = Number(formik.values.price) || 0;
            const compareSource = formik.values.compareAtPrice
              ? Number(formik.values.compareAtPrice)
              : listTotal;
            const savings = computeComboSavings(priceValue, compareSource);

            return (
              <form onSubmit={formik.handleSubmit} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* ── Basics ── */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="combo-name">
                        {t('admin.marketing.combos.form.name')}
                      </Label>
                      <Input
                        id="combo-name"
                        name="name"
                        value={formik.values.name}
                        onChange={(event) => {
                          formik.handleChange(event);
                          // A new offer's slug follows the name until an admin
                          // edits it; an existing one keeps the slug it was
                          // published under.
                          if (!combo && !formik.touched.slug) {
                            formik.setFieldValue(
                              'slug',
                              comboSlugify(event.target.value),
                            );
                          }
                        }}
                        onBlur={formik.handleBlur}
                        placeholder={t('admin.marketing.combos.form.namePlaceholder')}
                        className="mt-1.5 border-border"
                      />
                      {formik.touched.name && formik.errors.name ? (
                        <p className="mt-1 font-caption text-xs text-destructive-600">
                          {formik.errors.name}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <Label htmlFor="combo-slug">
                        {t('admin.marketing.combos.form.slug')}
                      </Label>
                      <Input
                        id="combo-slug"
                        name="slug"
                        value={formik.values.slug}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="brooklyn-tabby-duo"
                        className="mt-1.5 border-border"
                      />
                      <p className="mt-1 font-caption text-xs text-muted-foreground">
                        {t('admin.marketing.combos.form.slugHint', {
                          path: `/combo-bundles/${
                            comboSlugify(formik.values.slug || formik.values.name) ||
                            'offer-slug'
                          }`,
                        })}
                      </p>
                      {formik.touched.slug && formik.errors.slug ? (
                        <p className="mt-1 font-caption text-xs text-destructive-600">
                          {formik.errors.slug}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <Label htmlFor="combo-description">
                        {t('admin.marketing.combos.form.description')}
                      </Label>
                      <Textarea
                        id="combo-description"
                        name="description"
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        rows={3}
                        className="mt-1.5 resize-none border-border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="combo-badge">
                        {t('admin.marketing.combos.form.badge')}
                      </Label>
                      <Input
                        id="combo-badge"
                        name="badgeText"
                        value={formik.values.badgeText}
                        onChange={formik.handleChange}
                        placeholder={t('admin.marketing.combos.form.badgePlaceholder')}
                        className="mt-1.5 border-border"
                      />
                      <p className="mt-1 font-caption text-xs text-muted-foreground">
                        {t('admin.marketing.combos.form.badgeHint')}
                      </p>
                    </div>

                    <div>
                      <Label>{t('admin.marketing.combos.form.media')}</Label>
                      <div className="mt-1.5">
                        <FileUpload
                          accept="image/*"
                          multiple
                          maxSize={8 * 1024 * 1024}
                          onUpload={(url) =>
                            setImages((current) =>
                              current.includes(url) ? current : [...current, url].slice(0, 8),
                            )
                          }
                        />
                      </div>
                      <p className="mt-1 font-caption text-xs text-muted-foreground">
                        {t('admin.marketing.combos.form.mediaHint')}
                      </p>
                      {images.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {images.map((image) => (
                            <li key={image} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image}
                                alt=""
                                className="h-20 w-20 border border-border object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setImages((current) =>
                                    current.filter((entry) => entry !== image),
                                  )
                                }
                                aria-label={t('admin.marketing.combos.form.removeImage')}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-foreground text-background"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  {/* ── Composition, price, schedule ── */}
                  <div className="space-y-4">
                    <div>
                      <Label>
                        {t('admin.marketing.combos.form.components', {
                          count: components.length,
                        })}
                      </Label>
                      <div className="mt-1.5">
                        <ComboComponentPicker
                          components={components}
                          onChange={setComponents}
                          max={MAX_COMPONENTS}
                          error={componentError}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="combo-price">
                          {t('admin.marketing.combos.form.price')}
                        </Label>
                        <Input
                          id="combo-price"
                          name="price"
                          type="number"
                          min={1}
                          value={formik.values.price}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="mt-1.5 border-border"
                        />
                        {formik.touched.price && formik.errors.price ? (
                          <p className="mt-1 font-caption text-xs text-destructive-600">
                            {formik.errors.price}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <Label htmlFor="combo-compare">
                          {t('admin.marketing.combos.form.compareAt')}
                        </Label>
                        <Input
                          id="combo-compare"
                          name="compareAtPrice"
                          type="number"
                          min={0}
                          value={formik.values.compareAtPrice}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder={String(listTotal || '')}
                          className="mt-1.5 border-border"
                        />
                        <p className="mt-1 font-caption text-xs text-muted-foreground">
                          {t('admin.marketing.combos.form.compareAtHint')}
                        </p>
                      </div>
                    </div>

                    {/* Live savings, against the same sum the storefront strikes through. */}
                    <div className="border border-border bg-muted/40 p-4">
                      <p className="font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {t('admin.marketing.combos.form.savingsPreview')}
                      </p>
                      <dl className="mt-2 space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="font-caption text-xs text-muted-foreground">
                            {t('admin.marketing.combos.form.componentTotal')}
                          </dt>
                          <dd className="font-price text-sm text-foreground">
                            {formatEuroCurrency(listTotal)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="font-caption text-xs text-muted-foreground">
                            {t('admin.marketing.combos.form.fixedPrice')}
                          </dt>
                          <dd className="font-price text-sm text-foreground">
                            {formatEuroCurrency(priceValue)}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                          <dt className="font-caption text-xs text-muted-foreground">
                            {t('admin.marketing.combos.form.customerSaves')}
                          </dt>
                          <dd className="font-price text-sm text-foreground">
                            {savings.savings > 0
                              ? `${formatEuroCurrency(savings.savings)} · ${savings.savingsPercent}%`
                              : t('admin.marketing.combos.form.noSaving')}
                          </dd>
                        </div>
                      </dl>
                      {priceValue > 0 && savings.savings <= 0 ? (
                        <p className="mt-2 font-caption text-xs text-warning-600">
                          {t('admin.marketing.combos.form.priceAboveComponents')}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>{t('admin.marketing.combos.form.startsAt')}</Label>
                        <DateTimePicker
                          selected={formik.values.startsAt}
                          onChange={(date) =>
                            formik.setFieldValue('startsAt', date || undefined)
                          }
                          placeholder={t('admin.marketing.combos.form.optional')}
                        />
                      </div>
                      <div>
                        <Label>{t('admin.marketing.combos.form.endsAt')}</Label>
                        <DateTimePicker
                          selected={formik.values.endsAt}
                          onChange={(date) =>
                            formik.setFieldValue('endsAt', date || undefined)
                          }
                          placeholder={t('admin.marketing.combos.form.optional')}
                          error={Boolean(formik.errors.endsAt)}
                        />
                        {formik.errors.endsAt ? (
                          <p className="mt-1 font-caption text-xs text-destructive-600">
                            {String(formik.errors.endsAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="flex flex-1 items-center justify-between gap-3 border border-border p-3">
                        <Label htmlFor="combo-active" className="font-medium">
                          {t('admin.marketing.combos.form.active')}
                        </Label>
                        <Switch
                          id="combo-active"
                          checked={formik.values.isActive}
                          onCheckedChange={(checked) =>
                            formik.setFieldValue('isActive', checked)
                          }
                        />
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-3 border border-border p-3">
                        <Label htmlFor="combo-featured" className="font-medium">
                          {t('admin.marketing.combos.form.featured')}
                        </Label>
                        <Switch
                          id="combo-featured"
                          checked={formik.values.isFeatured}
                          onCheckedChange={(checked) =>
                            formik.setFieldValue('isFeatured', checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-border pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={formik.isSubmitting}
                  >
                    {t('admin.marketing.combos.form.cancel')}
                  </Button>
                  <Button type="submit" disabled={formik.isSubmitting || hydrating}>
                    {formik.isSubmitting
                      ? t('admin.marketing.combos.form.saving')
                      : combo
                        ? t('admin.marketing.combos.form.update')
                        : t('admin.marketing.combos.form.create')}
                  </Button>
                </div>
              </form>
            );
          }}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
