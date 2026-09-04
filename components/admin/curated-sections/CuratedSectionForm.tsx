'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  CURATED_AUTO_SOURCES,
  CURATED_SOURCE_MODES,
  CURATED_VARIANTS,
  MAX_CURATED_PRODUCTS,
  MAX_MANUAL_PICKS,
  defaultCtaHref,
  originLabelKey,
  slugifyKey,
  type AdminCuratedProduct,
  type CuratedAutoSource,
  type CuratedSection,
  type CuratedSectionInput,
  type CuratedSourceMode,
  type CuratedVariant,
} from '@/lib/curated-sections/types';
import { cn, formatEuroCurrency } from '@/lib/utils';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

interface CatalogProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  thumbnailImage?: string;
}

interface Props {
  section?: CuratedSection | null;
  submitting?: boolean;
  onSubmit: (values: CuratedSectionInput) => Promise<void> | void;
  onCancel: () => void;
}

const VARIANT_KEYS: Record<CuratedVariant, { label: string; help: string }> = {
  grid: {
    label: 'admin.curatedSections.variantGrid',
    help: 'admin.curatedSections.variantGridHelp',
  },
  rail: {
    label: 'admin.curatedSections.variantRail',
    help: 'admin.curatedSections.variantRailHelp',
  },
  editorial: {
    label: 'admin.curatedSections.variantEditorial',
    help: 'admin.curatedSections.variantEditorialHelp',
  },
};

const SOURCE_KEYS: Record<CuratedSourceMode, { label: string; help: string }> = {
  manual: {
    label: 'admin.curatedSections.sourceManual',
    help: 'admin.curatedSections.sourceManualHelp',
  },
  auto: {
    label: 'admin.curatedSections.sourceAuto',
    help: 'admin.curatedSections.sourceAutoHelp',
  },
  hybrid: {
    label: 'admin.curatedSections.sourceHybrid',
    help: 'admin.curatedSections.sourceHybridHelp',
  },
};

const AUTO_SOURCE_KEYS: Record<CuratedAutoSource, string> = {
  latest: 'admin.curatedSections.autoLatest',
  featured: 'admin.curatedSections.autoFeatured',
  'new-arrivals': 'admin.curatedSections.autoNewArrivals',
  'best-selling': 'admin.curatedSections.autoBestSelling',
  'limited-edition': 'admin.curatedSections.autoLimitedEdition',
  category: 'admin.curatedSections.autoCategory',
};

function emptyValues(): CuratedSectionInput {
  return {
    key: '',
    label: '',
    eyebrow: '',
    title: '',
    subtitle: '',
    ctaText: '',
    ctaHref: '',
    variant: 'grid',
    isActive: true,
    order: 0,
    sourceMode: 'auto',
    autoSource: 'latest',
    categorySlug: '',
    manualProductIds: [],
    limit: 8,
  };
}

function toValues(section?: CuratedSection | null): CuratedSectionInput {
  if (!section) return emptyValues();
  const { _id: _ignored, createdAt: _c, updatedAt: _u, ...rest } = section;
  return { ...emptyValues(), ...rest };
}

/** Search-and-pin list for the manual half of a section. */
function ManualPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [known, setKnown] = useState<Record<string, CatalogProduct>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '20',
          active: 'true',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (query.trim()) params.set('search', query.trim());
        const response = await fetch(`/api/admin/products?${params}`);
        const data = await response.json();
        const products: CatalogProduct[] = Array.isArray(data.products)
          ? data.products
          : [];
        setResults(products);
        // Remember every product we have seen, so an already-pinned chip keeps
        // its name after the search query moves on.
        setKnown((current) => {
          const next = { ...current };
          for (const product of products) next[product._id] = product;
          return next;
        });
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.curatedSections.manualPicks')}
          aria-label={t('admin.curatedSections.manualPicks')}
          className="border-border pl-9"
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded border border-border">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader size="sm" label={null} />
          </div>
        ) : (
          results.map((product) => {
            const selected = selectedIds.includes(product._id);
            return (
              <button
                key={product._id}
                type="button"
                disabled={selected || selectedIds.length >= MAX_MANUAL_PICKS}
                onClick={() => onChange([...selectedIds, product._id])}
                className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted disabled:opacity-40"
              >
                {product.thumbnailImage ? (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden bg-muted">
                    <Image
                      src={product.thumbnailImage}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 shrink-0 bg-muted" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {product.name}
                </span>
                <span className="font-price text-xs text-subtle-foreground">
                  {formatEuroCurrency(product.price)}
                </span>
                <Plus className="h-4 w-4 shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 border border-border bg-muted px-2 py-1 text-xs"
            >
              {known[id]?.name || id.slice(-6)}
              <button
                type="button"
                aria-label={known[id]?.name || id}
                onClick={() => onChange(selectedIds.filter((x) => x !== id))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Live preview of what the section resolves to, with each tile badged by where
 * it came from.
 *
 * The badges are the whole point of this panel: with a hybrid source it is
 * otherwise impossible to tell a pinned product from one the sales query
 * supplied. They come from the admin-only preview endpoint and never reach the
 * storefront payload.
 */
function ResolvedPreview({
  sectionId,
  values,
}: {
  sectionId?: string;
  values: CuratedSectionInput;
}) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<AdminCuratedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/curated-sections/${sectionId || 'new'}/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
      );
      const data = await response.json().catch(() => null);
      // Drop a response that a newer request has already superseded.
      if (latestRequest.current !== requestId) return;
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch {
      if (latestRequest.current === requestId) setProducts([]);
    } finally {
      if (latestRequest.current === requestId) setLoading(false);
    }
    // `values` is intentionally read at call time rather than tracked: the
    // preview refreshes on the source fields below, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, values]);

  /**
   * Re-resolve when something that changes the *product set* changes — not on
   * every keystroke in the copy fields, which cannot affect the result.
   */
  const sourceSignature = [
    sectionId ?? 'new',
    values.sourceMode,
    values.autoSource,
    values.categorySlug,
    values.limit,
    values.manualProductIds.join(','),
  ].join('|');

  useEffect(() => {
    const timer = window.setTimeout(refresh, 300);
    return () => window.clearTimeout(timer);
    // `refresh` closes over the whole draft and changes every render; the
    // signature above is what should actually re-trigger a preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSignature]);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-navigation text-sm font-semibold text-foreground">
            {t('admin.curatedSections.preview')}
          </p>
          <p className="mt-0.5 font-caption text-xs text-muted-foreground">
            {t('admin.curatedSections.previewBlurb')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('admin.curatedSections.previewRefresh')}
        </Button>
      </div>

      {!loading && products.length === 0 ? (
        <p className="py-6 text-center font-paragraph text-sm text-muted-foreground">
          {t('admin.curatedSections.previewEmpty')}
        </p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {products.map((product, index) => (
            <li
              key={product._id}
              className="flex items-center gap-3 rounded border border-border bg-muted/40 p-2"
            >
              <span className="w-5 shrink-0 text-center font-caption text-xs tabular-nums text-subtle-foreground">
                {index + 1}
              </span>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden bg-muted">
                <Image
                  src={product.images[0]}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{product.name}</p>
                <Badge
                  variant={product.origin === 'manual' ? 'default' : 'subtle'}
                  className="mt-1 text-[10px] uppercase tracking-wide"
                >
                  {t(originLabelKey(product.origin))}
                </Badge>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="font-caption text-xs text-subtle-foreground">
        {t('admin.curatedSections.previewNote')}
      </p>
    </div>
  );
}

export default function CuratedSectionForm({
  section,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<CuratedSectionInput>(() => toValues(section));

  const set = <K extends keyof CuratedSectionInput>(
    field: K,
    value: CuratedSectionInput[K],
  ) => setValues((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...values,
      key: values.key || slugifyKey(values.label),
    });
  };

  const usesAuto = values.sourceMode !== 'manual';
  const usesManual = values.sourceMode !== 'auto';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>{t('admin.curatedSections.name')} *</Label>
          <Input
            value={values.label}
            onChange={(event) => set('label', event.target.value)}
            className="mt-1.5 border-border"
            required
          />
          <p className="mt-1 font-caption text-xs text-subtle-foreground">
            {t('admin.curatedSections.nameHelp')}
          </p>
        </div>
        <div>
          <Label>{t('admin.curatedSections.key')}</Label>
          <Input
            value={values.key}
            onChange={(event) => set('key', slugifyKey(event.target.value))}
            placeholder={slugifyKey(values.label)}
            className="mt-1.5 border-border"
          />
          <p className="mt-1 font-caption text-xs text-subtle-foreground">
            {t('admin.curatedSections.keyHelp')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>{t('admin.curatedSections.eyebrow')}</Label>
          <Input
            value={values.eyebrow}
            onChange={(event) => set('eyebrow', event.target.value)}
            className="mt-1.5 border-border"
          />
        </div>
        <div>
          <Label>{t('admin.curatedSections.headline')}</Label>
          <Input
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            placeholder={values.label}
            className="mt-1.5 border-border"
          />
        </div>
      </div>

      <div>
        <Label>{t('admin.curatedSections.subtitle')}</Label>
        <Textarea
          value={values.subtitle}
          onChange={(event) => set('subtitle', event.target.value)}
          rows={2}
          className="mt-1.5 resize-none border-border"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>{t('admin.curatedSections.ctaText')}</Label>
          <Input
            value={values.ctaText}
            onChange={(event) => set('ctaText', event.target.value)}
            className="mt-1.5 border-border"
          />
        </div>
        <div>
          <Label>{t('admin.curatedSections.ctaHref')}</Label>
          <Input
            value={values.ctaHref}
            onChange={(event) => set('ctaHref', event.target.value)}
            placeholder={defaultCtaHref(values)}
            className="mt-1.5 border-border"
          />
          <p className="mt-1 font-caption text-xs text-subtle-foreground">
            {t('admin.curatedSections.ctaHrefHelp')}
          </p>
        </div>
      </div>

      <div>
        <Label>{t('admin.curatedSections.variant')}</Label>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {CURATED_VARIANTS.map((variant) => {
            const active = values.variant === variant;
            return (
              <button
                key={variant}
                type="button"
                onClick={() => set('variant', variant)}
                aria-pressed={active}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-foreground bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-foreground/40',
                )}
              >
                <span className="block font-navigation text-sm font-medium">
                  {t(VARIANT_KEYS[variant].label)}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block font-caption text-xs',
                    active ? 'text-primary-foreground/75' : 'text-muted-foreground',
                  )}
                >
                  {t(VARIANT_KEYS[variant].help)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>{t('admin.curatedSections.sourceMode')}</Label>
          <Select
            value={values.sourceMode}
            onValueChange={(value) => set('sourceMode', value as CuratedSourceMode)}
          >
            <SelectTrigger className="mt-1.5 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURATED_SOURCE_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(SOURCE_KEYS[mode].label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 font-caption text-xs text-subtle-foreground">
            {t(SOURCE_KEYS[values.sourceMode].help)}
          </p>
        </div>

        {usesAuto ? (
          <div>
            <Label>{t('admin.curatedSections.autoSource')}</Label>
            <Select
              value={values.autoSource}
              onValueChange={(value) => set('autoSource', value as CuratedAutoSource)}
            >
              <SelectTrigger className="mt-1.5 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURATED_AUTO_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {t(AUTO_SOURCE_KEYS[source])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {usesAuto && values.autoSource === 'category' ? (
          <div>
            <Label>{t('admin.curatedSections.categorySlug')} *</Label>
            <Input
              value={values.categorySlug}
              onChange={(event) => set('categorySlug', slugifyKey(event.target.value))}
              placeholder="women-bags"
              className="mt-1.5 border-border"
            />
          </div>
        ) : null}

        <div>
          <Label>{t('admin.curatedSections.limit')}</Label>
          <Input
            type="number"
            min={1}
            max={MAX_CURATED_PRODUCTS}
            value={values.limit}
            onChange={(event) => set('limit', Number(event.target.value))}
            className="mt-1.5 border-border"
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3 lg:mt-6">
          <Switch
            checked={values.isActive}
            onCheckedChange={(checked) => set('isActive', checked)}
          />
          <Label>{t('admin.curatedSections.live')}</Label>
        </div>
      </div>

      {usesManual ? (
        <div>
          <Label>{t('admin.curatedSections.manualPicks')}</Label>
          <div className="mt-1.5">
            <ManualPicker
              selectedIds={values.manualProductIds}
              onChange={(ids) => set('manualProductIds', ids)}
            />
          </div>
        </div>
      ) : null}

      <ResolvedPreview sectionId={section?._id} values={values} />

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t('admin.curatedSections.cancel')}
        </Button>
        <Button type="submit" disabled={submitting || !values.label.trim()}>
          {submitting ? <Loader size="sm" label={null} className="mr-2" /> : null}
          {t('admin.curatedSections.save')}
        </Button>
      </div>
    </form>
  );
}
