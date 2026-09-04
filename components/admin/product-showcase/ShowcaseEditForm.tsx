'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import FileUpload from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CARD_STYLE_OPTIONS,
  emptyShowcaseInput,
  emptySplitPanel,
  emptyTab,
  mediaRatio,
  PRODUCT_SOURCE_OPTIONS,
  resolveMediaFraming,
  resolveShowcaseTemplate,
  splitPanelHasContent,
  TEMPLATE_OPTIONS,
  type ShowcaseSection,
  type ShowcaseSectionInput,
  type ShowcaseTab,
  type ShowcaseTemplate,
  type SplitPanel,
} from '@/lib/product-showcase/types';
import { formatEuroCurrency } from '@/lib/utils';
import { isVideoAssetUrl } from '@/lib/hero-carousel/types';
import {
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader } from '@/components/ui/loader';

interface CatalogProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  thumbnailImage?: string;
}

interface Props {
  section?: ShowcaseSection | null;
  submitting?: boolean;
  onSubmit: (values: ShowcaseSectionInput) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Preview of one uploaded asset, with the clear control.
 *
 * A video is previewed as a video: paused on its first frame with a play
 * control over it, rather than the silent frozen frame this used to show — an
 * admin could not tell a still from a clip, let alone check the footage they
 * had just uploaded. The asset is fitted rather than cropped, because the point
 * of this frame is to show what was uploaded, including its shape: a vertical
 * clip has to read as vertical here, since that is what decides how the
 * storefront panel crops it.
 */
function MediaClearPreview({
  url,
  onClear,
}: {
  url: string;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = isVideoAssetUrl(url);

  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  /**
   * Only the metadata is fetched up front. Hovering the frame — which precedes
   * every click on the play control — starts the rest, so playback begins on
   * the click instead of stalling on it.
   */
  const [preload, setPreload] = useState<'metadata' | 'auto'>('metadata');

  /**
   * Warm the asset on hover. Raising `preload` alone is only advisory once the
   * element exists, so an untouched video is re-initialised with it — safe
   * while nothing is buffered (`readyState` 0) and nothing but the poster frame
   * is on screen.
   */
  const warmPlayback = () => {
    if (preload === 'auto') return;
    setPreload('auto');
    const video = videoRef.current;
    if (video && video.readyState === 0) video.load();
  };

  /* A new asset in the same slot starts from a clean state. */
  useEffect(() => {
    setPlaying(false);
    setBusy(false);
    setFailed(false);
    setDimensions(null);
    setPreload('metadata');
  }, [url]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    // Muted, so the play promise is never refused by the autoplay policy and
    // an admin dialog never starts making noise.
    video.muted = true;
    setPreload('auto');
    // Buffering starts with the play() call itself; the spinner covers the wait
    // so the control never looks stuck.
    setBusy(true);
    const started = video.play();
    if (started && typeof started.catch === 'function') {
      started.catch(() => {
        setBusy(false);
        setPlaying(false);
      });
    }
  };

  const framing = resolveMediaFraming(
    dimensions ? mediaRatio(dimensions.width, dimensions.height) : null
  );

  return (
    <div
      className="relative mt-2 h-40 overflow-hidden border border-border bg-muted"
      onMouseEnter={isVideo && !failed ? warmPlayback : undefined}
    >
      {isVideo && !failed ? (
        <video
          ref={videoRef}
          key={url}
          // The fragment asks for the first frame, so the frame is a preview of
          // the footage rather than a black rectangle before the first play.
          src={`${url}#t=0.001`}
          className="h-full w-full object-contain"
          muted
          loop
          playsInline
          preload={preload}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.videoWidth && video.videoHeight) {
              setDimensions({
                width: video.videoWidth,
                height: video.videoHeight,
              });
            }
          }}
          onPlaying={() => {
            setPlaying(true);
            setBusy(false);
          }}
          onWaiting={() => setBusy(true)}
          onPause={() => {
            setPlaying(false);
            setBusy(false);
          }}
          onError={() => {
            setFailed(true);
            setBusy(false);
            setPlaying(false);
          }}
          onClick={togglePlayback}
        />
      ) : isVideo ? (
        <p className="flex h-full items-center justify-center px-6 text-center text-xs text-subtle-foreground">
          {t('admin.showcase.videoUnavailable')}
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-contain"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) {
              setDimensions({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            }
          }}
        />
      )}

      {isVideo && !failed ? (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={
            playing
              ? t('admin.showcase.pausePreview')
              : t('admin.showcase.playPreview')
          }
          className={`absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/75 ${
            playing ? 'opacity-0 hover:opacity-100 focus-visible:opacity-100' : 'opacity-100'
          }`}
        >
          {busy ? (
            <Loader size="sm" label={null} />
          ) : playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>
      ) : null}

      {dimensions ? (
        <p className="absolute bottom-2 left-2 z-10 bg-black/60 px-2 py-1 font-label text-[10px] uppercase tracking-wide text-white">
          {t('admin.showcase.mediaDimensions', {
            width: dimensions.width,
            height: dimensions.height,
          })}
          {' · '}
          {t(
            framing.orientation === 'landscape'
              ? 'admin.showcase.orientation.landscape'
              : framing.orientation === 'square'
                ? 'admin.showcase.orientation.square'
                : 'admin.showcase.orientation.portrait'
          )}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onClear}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
        aria-label={t('admin.showcase.clearMedia')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProductPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '20',
          active: 'true',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`/api/admin/products?${params}`);
        const data = await res.json();
        setResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-2 border border-border p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products to add…"
          className="border-border pl-9"
        />
      </div>
      <div className="max-h-40 overflow-y-auto border border-border">
        {loading ? (
          <p className="px-3 py-2 text-sm text-subtle-foreground">Searching…</p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2 text-sm text-subtle-foreground">No products found.</p>
        ) : (
          results.map((product) => {
            const selected = selectedIds.includes(product._id);
            return (
              <button
                key={product._id}
                type="button"
                disabled={selected}
                onClick={() => onChange([...selectedIds, product._id])}
                className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted disabled:opacity-40"
              >
                {product.thumbnailImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnailImage}
                    alt=""
                    className="h-8 w-8 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{product.name}</p>
                  <p className="text-xs font-price text-subtle-foreground">
                    {formatEuroCurrency(product.price)}
                  </p>
                </div>
                <Plus className="h-4 w-4" />
              </button>
            );
          })
        )}
      </div>
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedIds.map((id) => {
            const product = results.find((p) => p._id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 border border-border bg-muted px-2 py-1 text-xs"
              >
                {product?.name || id.slice(-6)}
                <button
                  type="button"
                  onClick={() => onChange(selectedIds.filter((x) => x !== id))}
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SplitPanelFields({
  label,
  panel,
  onChange,
}: {
  label: string;
  panel: SplitPanel;
  onChange: (next: SplitPanel) => void;
}) {
  const { t } = useTranslation();
  const [draftUrl, setDraftUrl] = useState(panel.mediaUrl || '');

  useEffect(() => {
    setDraftUrl(panel.mediaUrl || '');
  }, [panel.mediaUrl]);

  const applyUrl = (url: string) => {
    const trimmed = url.trim();
    const mediaType = isVideoAssetUrl(trimmed) ? 'video' : 'image';
    onChange({ ...panel, mediaUrl: trimmed, mediaType });
    setDraftUrl(trimmed);
  };

  const isVideo = panel.mediaType === 'video' || isVideoAssetUrl(panel.mediaUrl || '');

  return (
    <div className="space-y-3 border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div>
        <Label>Background media</Label>
        <div className="mt-1.5">
          <FileUpload
            accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            multiple={false}
            maxSize={25 * 1024 * 1024}
            onUpload={(url) => applyUrl(url)}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="Or paste media URL"
            className="border-border"
          />
          <Button type="button" variant="outline" onClick={() => applyUrl(draftUrl)}>
            Use
          </Button>
        </div>
        {panel.mediaUrl ? (
          <MediaClearPreview
            url={panel.mediaUrl}
            // Reset the type too, or a cleared video leaves the panel marked as
            // one and the next image is rendered through the <video> path.
            onClear={() =>
              onChange({ ...panel, mediaUrl: '', mediaType: 'image', posterImage: '' })
            }
          />
        ) : null}
      </div>
      {isVideo ? (
        <div>
          <Label>{t('admin.showcase.posterImage')}</Label>
          <div className="mt-1.5">
            <FileUpload
              accept="image/*"
              multiple={false}
              maxSize={8 * 1024 * 1024}
              onUpload={(url) => onChange({ ...panel, posterImage: url })}
            />
          </div>
          <p className="mt-1 text-xs text-subtle-foreground">
            {t('admin.showcase.posterImageHelp')}
          </p>
          {panel.posterImage ? (
            <MediaClearPreview
              url={panel.posterImage}
              onClear={() => onChange({ ...panel, posterImage: '' })}
            />
          ) : null}
        </div>
      ) : null}
      <div>
        <Label>{t('admin.showcase.kicker')}</Label>
        <Input
          value={panel.kicker || ''}
          onChange={(e) => onChange({ ...panel, kicker: e.target.value })}
          placeholder={t('admin.showcase.kickerPlaceholder')}
          className="mt-1.5 border-border"
        />
      </div>
      <div>
        <Label>Title (optional)</Label>
        <Input
          value={panel.title || ''}
          onChange={(e) => onChange({ ...panel, title: e.target.value })}
          className="mt-1.5 border-border"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>CTA label</Label>
          <Input
            value={panel.ctaLabel || ''}
            onChange={(e) => onChange({ ...panel, ctaLabel: e.target.value })}
            className="mt-1.5 border-border"
          />
        </div>
        <div>
          <Label>CTA link</Label>
          <Input
            value={panel.ctaLink || ''}
            onChange={(e) => onChange({ ...panel, ctaLink: e.target.value })}
            className="mt-1.5 border-border"
          />
        </div>
      </div>
      <div>
        <Label>Floating product (optional)</Label>
        <ProductPicker
          selectedIds={panel.productId ? [panel.productId] : []}
          onChange={(ids) =>
            onChange({ ...panel, productId: ids[ids.length - 1] || '' })
          }
        />
      </div>
    </div>
  );
}

function TabEditor({
  tab,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  tab: ShowcaseTab;
  index: number;
  canRemove: boolean;
  onChange: (tab: ShowcaseTab) => void;
  onRemove: () => void;
}) {
  const promo = tab.promotion || {};
  const [draftUrl, setDraftUrl] = useState(
    promo.video || promo.image || ''
  );

  useEffect(() => {
    setDraftUrl(promo.video || promo.image || '');
  }, [promo.video, promo.image]);

  const applyPromoMedia = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      onChange({
        ...tab,
        promotion: { ...promo, image: '', video: '' },
      });
      setDraftUrl('');
      return;
    }
    if (isVideoAssetUrl(trimmed)) {
      onChange({
        ...tab,
        promotion: { ...promo, video: trimmed, image: promo.image || '' },
      });
    } else {
      onChange({
        ...tab,
        promotion: { ...promo, image: trimmed, video: '' },
      });
    }
    setDraftUrl(trimmed);
  };

  return (
    <div className="space-y-3 border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tab {index + 1}
        </p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Tab title</Label>
          <Input
            value={tab.title}
            onChange={(e) => onChange({ ...tab, title: e.target.value })}
            className="mt-1.5 border-border"
          />
        </div>
        <div>
          <Label>Product source</Label>
          <Select
            value={tab.productSource}
            onValueChange={(value) =>
              onChange({
                ...tab,
                productSource: value as ShowcaseTab['productSource'],
              })
            }
          >
            <SelectTrigger className="mt-1.5 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tab.productSource === 'category' ? (
        <div>
          <Label>Category slug</Label>
          <Input
            value={tab.categorySlug || ''}
            onChange={(e) => onChange({ ...tab, categorySlug: e.target.value })}
            className="mt-1.5 border-border"
            placeholder="women-bags"
          />
        </div>
      ) : null}

      {tab.productSource === 'manual' ? (
        <ProductPicker
          selectedIds={tab.productIds || []}
          onChange={(ids) => onChange({ ...tab, productIds: ids })}
        />
      ) : (
        <div>
          <Label>Product limit</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={tab.limit ?? 8}
            onChange={(e) => onChange({ ...tab, limit: Number(e.target.value) })}
            className="mt-1.5 border-border"
          />
        </div>
      )}

      <div className="space-y-2 border border-dashed border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Promo banner (optional)
        </p>
        <FileUpload
          accept="image/*,video/mp4,video/webm,.mp4,.webm,.mov"
          multiple={false}
          maxSize={25 * 1024 * 1024}
          onUpload={(url) => applyPromoMedia(url)}
        />
        <div className="flex gap-2">
          <Input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="Banner image/video URL"
            className="border-border"
          />
          <Button type="button" variant="outline" onClick={() => applyPromoMedia(draftUrl)}>
            Use
          </Button>
        </div>
        {(promo.video || promo.image) && (
          <MediaClearPreview
            url={(promo.video || promo.image) as string}
            onClear={() => applyPromoMedia('')}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Kicker</Label>
            <Input
              value={promo.kicker || ''}
              onChange={(e) =>
                onChange({
                  ...tab,
                  promotion: { ...promo, kicker: e.target.value },
                })
              }
              className="mt-1.5 border-border"
            />
          </div>
          <div>
            <Label>Banner title</Label>
            <Input
              value={promo.title || ''}
              onChange={(e) =>
                onChange({
                  ...tab,
                  promotion: { ...promo, title: e.target.value },
                })
              }
              className="mt-1.5 border-border"
            />
          </div>
          <div>
            <Label>Banner subtitle</Label>
            <Input
              value={promo.subtitle || ''}
              onChange={(e) =>
                onChange({
                  ...tab,
                  promotion: { ...promo, subtitle: e.target.value },
                })
              }
              className="mt-1.5 border-border"
            />
          </div>
          <div>
            <Label>CTA label</Label>
            <Input
              value={promo.ctaLabel || ''}
              onChange={(e) =>
                onChange({
                  ...tab,
                  promotion: { ...promo, ctaLabel: e.target.value },
                })
              }
              className="mt-1.5 border-border"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>CTA link</Label>
            <Input
              value={promo.ctaLink || ''}
              onChange={(e) =>
                onChange({
                  ...tab,
                  promotion: { ...promo, ctaLink: e.target.value },
                })
              }
              className="mt-1.5 border-border"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Build the form state for a section.
 *
 * The template is resolved rather than read straight off the document: a
 * section whose `template` was lost or written in another spelling still opens
 * on the right tab, decided by whichever panels it actually has. Split panels
 * fall back to a fresh empty panel so the poster and kicker inputs are
 * controlled from the first render.
 */
function toFormValues(section?: ShowcaseSection | null): ShowcaseSectionInput {
  if (!section) return emptyShowcaseInput('product_showcase');

  const template = resolveShowcaseTemplate(section.template, null, {
    splitLeft: section.splitLeft,
    splitRight: section.splitRight,
  });

  return {
    template,
    title: section.title,
    subtitle: section.subtitle || '',
    cardStyle:
      section.cardStyle === 'luxury' ||
      section.cardStyle === 'compact' ||
      section.cardStyle === 'showcase'
        ? section.cardStyle
        : template === 'split_media'
          ? 'compact'
          : 'showcase',
    isActive: section.isActive,
    order: section.order,
    tabs: section.tabs?.length ? section.tabs : [emptyTab(0)],
    splitLeft: { ...emptySplitPanel(), ...(section.splitLeft || {}) },
    splitRight: { ...emptySplitPanel(), ...(section.splitRight || {}) },
  };
}

export default function ShowcaseEditForm({
  section,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  // Initialised from the section, not defaulted and then corrected by an
  // effect: the old order rendered "Product showcase" on the first paint of
  // every edit dialog, and a split-media section that was saved from that frame
  // lost both of its panels.
  const [values, setValues] = useState<ShowcaseSectionInput>(() =>
    toFormValues(section)
  );

  useEffect(() => {
    setValues(toFormValues(section));
  }, [section]);

  /**
   * Switch template without discarding what is already in the form.
   *
   * Both templates' fields stay in state, so an admin who switches to compare
   * the two — or switches by accident — can switch back and still have their
   * tabs and panels. On a new section the starter copy follows the template, as
   * long as it is still untouched; a saved section keeps its own title and
   * subtitle whatever they happen to say.
   */
  const setTemplate = (template: ShowcaseTemplate) => {
    setValues((prev) => {
      if (prev.template === template) return prev;
      const next = emptyShowcaseInput(template);
      const previous = emptyShowcaseInput(prev.template);
      const isStarterCopy = (
        value: string | undefined,
        starter: string | undefined
      ) => !section && (value || '').trim() === (starter || '').trim();

      return {
        ...prev,
        template,
        title: isStarterCopy(prev.title, previous.title) ? next.title : prev.title,
        subtitle: isStarterCopy(prev.subtitle, previous.subtitle)
          ? next.subtitle
          : prev.subtitle,
        cardStyle: prev.cardStyle || next.cardStyle,
        tabs: prev.tabs?.length ? prev.tabs : [emptyTab(0)],
        // A saved section is never given starter panel copy it did not have —
        // only a brand-new section picks up the template's placeholders.
        splitLeft: splitPanelHasContent(prev.splitLeft)
          ? prev.splitLeft
          : (section ? undefined : next.splitLeft) ||
            prev.splitLeft ||
            emptySplitPanel(),
        splitRight: splitPanelHasContent(prev.splitRight)
          ? prev.splitRight
          : (section ? undefined : next.splitRight) ||
            prev.splitRight ||
            emptySplitPanel(),
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...values,
      cardStyle: values.cardStyle || 'showcase',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>{t('admin.showcase.template')}</Label>
          {/*
            Never disabled: the picker is how an existing section shows which
            template it was saved with, and locking it left a mis-saved section
            with no way back to its own form.
          */}
          <Select
            value={values.template}
            onValueChange={(v) => setTemplate(v as ShowcaseTemplate)}
          >
            <SelectTrigger className="mt-1.5 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-subtle-foreground">
            {t(
              TEMPLATE_OPTIONS.find((o) => o.value === values.template)
                ?.descriptionKey || 'admin.showcase.templates.productShowcase.description'
            )}
          </p>
          {section ? (
            <p className="mt-1 text-xs text-subtle-foreground">
              {t('admin.showcase.templateSwitchHint')}
            </p>
          ) : null}
        </div>
        {/*
          Split-media panels render their own product card, so the style picker
          would be a control with no effect there.
        */}
        <div className={values.template === 'split_media' ? 'hidden' : undefined}>
          <Label>{t('admin.showcase.cardStyle')}</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {CARD_STYLE_OPTIONS.map((opt) => {
              const active = (values.cardStyle || 'showcase') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      cardStyle: opt.value,
                    }))
                  }
                  className={`border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-foreground bg-primary text-white'
                      : 'border-border bg-card text-foreground hover:border-foreground/40'
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {t(opt.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-subtle-foreground">
            {t(
              CARD_STYLE_OPTIONS.find(
                (o) => o.value === (values.cardStyle || 'showcase')
              )?.descriptionKey || 'admin.showcase.cardStyles.showcase.description'
            )}
          </p>
          <input type="hidden" name="cardStyle" value={values.cardStyle || 'showcase'} readOnly />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>Section title *</Label>
          <Input
            value={values.title}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, title: e.target.value }))
            }
            className="mt-1.5 border-border"
            required
          />
        </div>
        <div className="flex items-center gap-3 border border-border bg-muted px-4 py-3 lg:mt-6">
          <Switch
            checked={Boolean(values.isActive)}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, isActive: checked }))
            }
            className="data-[state=checked]:bg-primary"
          />
          <Label>Active on landing page</Label>
        </div>
      </div>

      <div>
        <Label>Subtitle</Label>
        <Textarea
          value={values.subtitle || ''}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, subtitle: e.target.value }))
          }
          className="mt-1.5 resize-none border-border"
          rows={2}
        />
      </div>

      {values.template === 'product_showcase' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tabs / collections
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={(values.tabs?.length || 0) >= 6}
              onClick={() =>
                setValues((prev) => ({
                  ...prev,
                  tabs: [...(prev.tabs || []), emptyTab(prev.tabs?.length || 0)],
                }))
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add tab
            </Button>
          </div>
          {(values.tabs || []).map((tab, index) => (
            <TabEditor
              key={tab.id}
              tab={tab}
              index={index}
              canRemove={(values.tabs?.length || 0) > 1}
              onChange={(next) =>
                setValues((prev) => {
                  const tabs = [...(prev.tabs || [])];
                  tabs[index] = next;
                  return { ...prev, tabs };
                })
              }
              onRemove={() =>
                setValues((prev) => ({
                  ...prev,
                  tabs: (prev.tabs || []).filter((_, i) => i !== index),
                }))
              }
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SplitPanelFields
            label="Left panel"
            panel={values.splitLeft || emptySplitPanel()}
            onChange={(splitLeft) =>
              setValues((prev) => ({ ...prev, splitLeft }))
            }
          />
          <SplitPanelFields
            label="Right panel"
            panel={values.splitRight || emptySplitPanel()}
            onChange={(splitRight) =>
              setValues((prev) => ({ ...prev, splitRight }))
            }
          />
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !values.title.trim()}>
          {submitting ? <Loader size="sm" label={null} className="mr-2" /> : null}
          {section ? 'Update section' : 'Create section'}
        </Button>
      </div>
    </form>
  );
}
