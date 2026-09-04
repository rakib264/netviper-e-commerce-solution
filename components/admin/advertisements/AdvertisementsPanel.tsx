'use client';

import AdvertisementsSkeleton from '@/components/admin/advertisements/AdvertisementsSkeleton';
import { AdminRefreshIndicator } from '@/components/admin/ui/loading';
import AdOverlay from '@/components/home/advertisements/AdOverlay';
import {
  AD_SHAPE_CLASSES,
  type AdCardShape,
} from '@/components/home/advertisements/ad-shapes';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FileUpload from '@/components/ui/file-upload';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useToastWithTypes } from '@/hooks/use-toast';
import {
  MAX_ADS_PER_TYPE,
  isVideoAssetUrl,
  type AdMediaType,
  type AdvertisementDTO,
  type AdvertisementType,
} from '@/lib/advertisements/types';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Form, Formik } from 'formik';
import {
  Edit,
  Eye,
  Film,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import * as Yup from 'yup';

interface FormValues {
  mediaType: AdMediaType;
  mediaUrl: string;
  posterImage: string;
  badgeTitle: string;
  title: string;
  discountText: string;
  ctaLabel: string;
  ctaUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: FormValues = {
  mediaType: 'image',
  mediaUrl: '',
  posterImage: '',
  badgeTitle: '',
  title: '',
  discountText: '',
  ctaLabel: '',
  ctaUrl: '',
  isActive: true,
};

const FAMILIES: Array<{
  value: AdvertisementType;
  labelKey: string;
  blurbKey: string;
  aspect: string;
}> = [
  {
    value: 'horizontal',
    labelKey: 'admin.marketing.advertisement.horizontal',
    blurbKey: 'admin.marketing.advertisement.horizontalBlurb',
    aspect: 'aspect-[16/9]',
  },
  {
    value: 'vertical',
    labelKey: 'admin.marketing.advertisement.vertical',
    blurbKey: 'admin.marketing.advertisement.verticalBlurb',
    aspect: 'aspect-[3/4]',
  },
];

const MEDIA_ACCEPT =
  'image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';

/**
 * Advertisement management, mounted as a tab under Marketing & Deals.
 *
 * Each family is capped at `MAX_ADS_PER_TYPE` so the `multi` layout always
 * divides into equal columns. Position is a display order — drag the cards
 * rather than typing a number.
 */
export function AdvertisementsPanel() {
  const { t } = useTranslation();

  const [activeFamily, setActiveFamily] = useState<AdvertisementType>('horizontal');
  const [showDialog, setShowDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<AdvertisementDTO | null>(null);
  const [previewAd, setPreviewAd] = useState<AdvertisementDTO | null>(null);
  const [deletingAd, setDeletingAd] = useState<AdvertisementDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error } = useToastWithTypes();
  // Fresh identities every render — keep them out of dependency lists, or the
  // fetch effect re-runs forever and hammers the endpoint.
  const notify = useRef({ success, error });
  notify.current = { success, error };

  const {
    data: ads,
    setData: setAds,
    loading,
    refreshing,
    refresh,
  } = useAdminResource<AdvertisementDTO[]>({
    url: '/api/admin/advertisements',
    initialData: [],
    select: (payload) =>
      Array.isArray(payload.advertisements) ? payload.advertisements : [],
    onError: (message) =>
      notify.current.error(t('admin.marketing.advertisement.loadFailed'), message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const adSchema = useMemo(
    () =>
      Yup.object().shape({
        title: Yup.string()
          .required(t('admin.marketing.advertisement.errNameRequired'))
          .min(2, t('admin.marketing.advertisement.errNameShort')),
        mediaUrl: Yup.string().required(
          t('admin.marketing.advertisement.errMediaRequired'),
        ),
        posterImage: Yup.string().when('mediaType', {
          is: 'video',
          then: (schema) =>
            schema.required(t('admin.marketing.advertisement.errPosterRequired')),
          otherwise: (schema) => schema,
        }),
        badgeTitle: Yup.string().max(
          60,
          t('admin.marketing.advertisement.errBadgeLong'),
        ),
        discountText: Yup.string().max(
          60,
          t('admin.marketing.advertisement.errDiscountLong'),
        ),
        ctaLabel: Yup.string().max(
          40,
          t('admin.marketing.advertisement.errButtonLong'),
        ),
        ctaUrl: Yup.string(),
        isActive: Yup.boolean(),
      }),
    [t],
  );

  const byFamily = (type: AdvertisementType) =>
    ads.filter((ad) => ad.type === type).sort((a, b) => a.position - b.position);

  const handleSubmit = async (values: FormValues) => {
    try {
      const payload = {
        type: activeFamily,
        position: editingAd?.position ?? byFamily(activeFamily).length + 1,
        title: values.title,
        badgeTitle: values.badgeTitle,
        discountText: values.discountText,
        mediaType: values.mediaType,
        mediaUrl: values.mediaUrl,
        posterImage: values.posterImage,
        isActive: values.isActive,
        cta:
          values.ctaLabel && values.ctaUrl
            ? { label: values.ctaLabel, url: values.ctaUrl }
            : null,
      };

      const response = await fetch(
        editingAd
          ? `/api/admin/advertisements/${editingAd._id}`
          : '/api/admin/advertisements',
        {
          method: editingAd ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.details?.join(', ') ||
            data.error ||
            t('admin.marketing.advertisement.saveFailed'),
        );
      }

      success(
        t(
          editingAd
            ? 'admin.marketing.advertisement.updated'
            : 'admin.marketing.advertisement.created',
        ),
      );
      setShowDialog(false);
      setEditingAd(null);
      refresh();
    } catch (err: any) {
      error(t('admin.marketing.advertisement.saveFailed'), err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingAd) return;
    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/admin/advertisements?id=${deletingAd._id}`,
        { method: 'DELETE' },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || t('admin.marketing.advertisement.deleteFailed'),
        );
      }

      success(t('admin.marketing.advertisement.deleted'));
      setDeletingAd(null);
      refresh();
    } catch (err: any) {
      error(t('admin.marketing.advertisement.deleteFailed'), err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent, type: AdvertisementType) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const family = byFamily(type);
    const oldIndex = family.findIndex((ad) => ad._id === active.id);
    const newIndex = family.findIndex((ad) => ad._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = ads;
    const reordered = arrayMove(family, oldIndex, newIndex).map((ad, index) => ({
      ...ad,
      position: index + 1,
    }));

    setAds((current) => [...current.filter((ad) => ad.type !== type), ...reordered]);

    try {
      const response = await fetch('/api/admin/advertisements/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          items: reordered.map((ad) => ({ _id: ad._id, position: ad.position })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || t('admin.marketing.advertisement.reorderFailed'),
        );
      }
      success(t('admin.marketing.advertisement.reordered'));
    } catch (err: any) {
      // The optimistic order is dropped rather than left disagreeing with the DB.
      setAds(previous);
      error(t('admin.marketing.advertisement.reorderFailed'), err.message);
    }
  };

  const initialValues = (): FormValues => {
    if (!editingAd) return EMPTY_FORM;
    return {
      mediaType: editingAd.mediaType,
      mediaUrl: editingAd.mediaUrl,
      posterImage: editingAd.posterImage || '',
      badgeTitle: editingAd.badgeTitle || '',
      title: editingAd.title,
      discountText: editingAd.discountText || '',
      ctaLabel: editingAd.cta?.label || '',
      ctaUrl: editingAd.cta?.url || '',
      isActive: editingAd.isActive,
    };
  };

  const openCreate = (family: AdvertisementType) => {
    setEditingAd(null);
    setActiveFamily(family);
    setShowDialog(true);
  };

  const activeFamilyMeta = FAMILIES.find((family) => family.value === activeFamily)!;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-navigation text-base font-semibold text-foreground">
            {t('admin.marketing.advertisement.title')}
          </h2>
          <p className="mt-0.5 max-w-2xl font-paragraph text-sm text-muted-foreground">
            {t('admin.marketing.advertisement.subtitle', { max: MAX_ADS_PER_TYPE })}
          </p>
        </div>
        {refreshing ? (
          <AdminRefreshIndicator
            label={t('admin.marketing.common.updating')}
            className="shrink-0 sm:mt-1"
          />
        ) : null}
      </div>

      <Tabs
        value={activeFamily}
        onValueChange={(value) => setActiveFamily(value as AdvertisementType)}
      >
        <TabsList>
          {FAMILIES.map((family) => (
            <TabsTrigger key={family.value} value={family.value}>
              {t(family.labelKey)}
              <span className="ml-1.5 font-caption text-xs tabular-nums text-muted-foreground">
                {loading ? '—' : `${byFamily(family.value).length}/${MAX_ADS_PER_TYPE}`}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {FAMILIES.map((family) => {
          const familyAds = byFamily(family.value);
          const atLimit = familyAds.length >= MAX_ADS_PER_TYPE;

          return (
            <TabsContent key={family.value} value={family.value} className="mt-4">
              {loading ? (
                <AdvertisementsSkeleton
                  aspect={family.aspect}
                  label={t('admin.marketing.advertisement.loading')}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-2xl font-paragraph text-sm text-muted-foreground">
                      {t(family.blurbKey)}{' '}
                      <Link
                        href="/admin/landing-management/homepage-sections"
                        className="font-navigation text-foreground underline-offset-4 hover:underline"
                      >
                        {t('admin.marketing.advertisement.positionOnHomepage')}
                      </Link>
                      .
                    </p>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Button
                        size="sm"
                        disabled={atLimit}
                        onClick={() => openCreate(family.value)}
                      >
                        <Plus size={16} className="mr-2" />
                        {t('admin.marketing.advertisement.addAd', {
                          family: t(family.labelKey).toLowerCase(),
                        })}
                      </Button>
                      {atLimit ? (
                        <p className="font-caption text-xs text-muted-foreground">
                          {t('admin.marketing.advertisement.atLimit')}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {familyAds.length === 0 ? (
                    <div className="border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
                      <ImageIcon className="mx-auto h-10 w-10 text-subtle-foreground" />
                      <h3 className="mt-4 font-navigation text-base font-semibold text-foreground">
                        {t('admin.marketing.advertisement.emptyTitle', {
                          family: t(family.labelKey).toLowerCase(),
                        })}
                      </h3>
                      <p className="mt-1 font-paragraph text-sm text-muted-foreground">
                        {t('admin.marketing.advertisement.emptyBody')}
                      </p>
                      <Button className="mt-4" onClick={() => openCreate(family.value)}>
                        <Plus size={16} className="mr-2" />
                        {t('admin.marketing.advertisement.createAd')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="flex items-center font-caption text-xs text-subtle-foreground">
                        <GripVertical size={14} className="mr-1" />
                        {t('admin.marketing.advertisement.dragHint')}
                      </p>
                      {/* Dimmed, not replaced — the cards hold their place. */}
                      <div
                        className={cn(
                          'transition-opacity duration-200',
                          refreshing && 'pointer-events-none opacity-60',
                        )}
                        aria-busy={refreshing}
                      >
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, family.value)}
                        >
                          <SortableContext
                            items={familyAds.map((ad) => ad._id)}
                            strategy={rectSortingStrategy}
                          >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {familyAds.map((ad) => (
                                <SortableAdCard
                                  key={ad._id}
                                  ad={ad}
                                  aspect={family.aspect}
                                  onEdit={() => {
                                    setEditingAd(ad);
                                    setActiveFamily(ad.type);
                                    setShowDialog(true);
                                  }}
                                  onDelete={() => setDeletingAd(ad)}
                                  onPreview={() => setPreviewAd(ad)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Create / edit */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingAd(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t(
                editingAd
                  ? 'admin.marketing.advertisement.dialogEditTitle'
                  : 'admin.marketing.advertisement.dialogNewTitle',
                { family: t(activeFamilyMeta.labelKey).toLowerCase() },
              )}
            </DialogTitle>
            <DialogDescription>
              {t('admin.marketing.advertisement.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues()}
            validationSchema={adSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, errors, touched, setFieldValue, isSubmitting }) => (
              <Form className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title">
                    {t('admin.marketing.advertisement.internalName')} *
                  </Label>
                  <Input
                    id="title"
                    value={values.title}
                    onChange={(event) => setFieldValue('title', event.target.value)}
                    placeholder={t(
                      'admin.marketing.advertisement.internalNamePlaceholder',
                    )}
                  />
                  <p className="font-caption text-xs text-muted-foreground">
                    {t('admin.marketing.advertisement.internalNameHelp')}
                  </p>
                  {errors.title && touched.title ? (
                    <p className="font-caption text-sm text-destructive-600">
                      {errors.title}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label>{t('admin.marketing.advertisement.mediaType')}</Label>
                  <Select
                    value={values.mediaType}
                    onValueChange={(value) => setFieldValue('mediaType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">
                        {t('admin.marketing.advertisement.image')}
                      </SelectItem>
                      <SelectItem value="video">
                        {t('admin.marketing.advertisement.video')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {t(
                      values.mediaType === 'video'
                        ? 'admin.marketing.advertisement.video'
                        : 'admin.marketing.advertisement.image',
                    )}{' '}
                    *
                  </Label>
                  <FileUpload
                    accept={values.mediaType === 'video' ? VIDEO_ACCEPT : MEDIA_ACCEPT}
                    maxSize={25 * 1024 * 1024}
                    onUpload={(url) => {
                      setFieldValue('mediaUrl', url);
                      // Trust the uploaded asset over the dropdown.
                      setFieldValue(
                        'mediaType',
                        isVideoAssetUrl(url) ? 'video' : 'image',
                      );
                    }}
                  />
                  <Input
                    value={values.mediaUrl}
                    onChange={(event) => setFieldValue('mediaUrl', event.target.value)}
                    placeholder={t(
                      'admin.marketing.advertisement.mediaUrlPlaceholder',
                    )}
                  />
                  {values.mediaUrl ? (
                    <MediaPreview
                      mediaType={values.mediaType}
                      url={values.mediaUrl}
                      poster={values.posterImage}
                      alt={t('admin.marketing.advertisement.mediaPreviewAlt')}
                    />
                  ) : null}
                  {errors.mediaUrl && touched.mediaUrl ? (
                    <p className="font-caption text-sm text-destructive-600">
                      {errors.mediaUrl}
                    </p>
                  ) : null}
                </div>

                {values.mediaType === 'video' ? (
                  <div className="space-y-2">
                    <Label>
                      {t('admin.marketing.advertisement.posterImage')} *
                    </Label>
                    <p className="font-caption text-xs text-muted-foreground">
                      {t('admin.marketing.advertisement.posterHelp')}
                    </p>
                    <FileUpload
                      accept="image/*"
                      onUpload={(url) => setFieldValue('posterImage', url)}
                    />
                    {values.posterImage ? (
                      <div className="relative h-32 w-full overflow-hidden bg-muted">
                        <Image
                          src={values.posterImage}
                          alt={t('admin.marketing.advertisement.posterPreviewAlt')}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    {errors.posterImage && touched.posterImage ? (
                      <p className="font-caption text-sm text-destructive-600">
                        {errors.posterImage}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="badgeTitle">
                      {t('admin.marketing.advertisement.badge')}
                    </Label>
                    <Input
                      id="badgeTitle"
                      value={values.badgeTitle}
                      onChange={(event) =>
                        setFieldValue('badgeTitle', event.target.value)
                      }
                      placeholder={t(
                        'admin.marketing.advertisement.badgePlaceholder',
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discountText">
                      {t('admin.marketing.advertisement.discount')}
                    </Label>
                    <Input
                      id="discountText"
                      value={values.discountText}
                      onChange={(event) =>
                        setFieldValue('discountText', event.target.value)
                      }
                      placeholder={t(
                        'admin.marketing.advertisement.discountPlaceholder',
                      )}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ctaLabel">
                      {t('admin.marketing.advertisement.buttonLabel')}
                    </Label>
                    <Input
                      id="ctaLabel"
                      value={values.ctaLabel}
                      onChange={(event) =>
                        setFieldValue('ctaLabel', event.target.value)
                      }
                      placeholder={t(
                        'admin.marketing.advertisement.buttonLabelPlaceholder',
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ctaUrl">
                      {t('admin.marketing.advertisement.buttonLink')}
                    </Label>
                    <Input
                      id="ctaUrl"
                      value={values.ctaUrl}
                      onChange={(event) => setFieldValue('ctaUrl', event.target.value)}
                      placeholder={t(
                        'admin.marketing.advertisement.buttonLinkPlaceholder',
                      )}
                    />
                    <p className="font-caption text-xs text-muted-foreground">
                      {t('admin.marketing.advertisement.buttonLinkHelp')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border border-border bg-muted/30 p-4">
                  <div className="min-w-0">
                    <Label htmlFor="isActive">
                      {t('admin.marketing.advertisement.live')}
                    </Label>
                    <p className="font-caption text-sm text-subtle-foreground">
                      {t('admin.marketing.advertisement.liveToggleHelp')}
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={values.isActive}
                    onCheckedChange={(checked) => setFieldValue('isActive', checked)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                    disabled={isSubmitting}
                  >
                    {t('admin.marketing.advertisement.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {t(
                      isSubmitting
                        ? 'admin.marketing.advertisement.saving'
                        : editingAd
                          ? 'admin.marketing.advertisement.saveChanges'
                          : 'admin.marketing.advertisement.create',
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog
        open={Boolean(previewAd)}
        onOpenChange={(open) => (!open ? setPreviewAd(null) : undefined)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t('admin.marketing.advertisement.previewTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.marketing.advertisement.previewDescription')}
            </DialogDescription>
          </DialogHeader>
          {previewAd ? (
            <div className={previewAd.type === 'vertical' ? 'mx-auto max-w-[22rem]' : ''}>
              <StorefrontPreview ad={previewAd} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(deletingAd)}
        onOpenChange={(open) => (!open ? setDeletingAd(null) : undefined)}
        onConfirm={handleDelete}
        title={t('admin.marketing.advertisement.deleteTitle')}
        description={t('admin.marketing.advertisement.deleteBody')}
        entityName={deletingAd?.title || t('admin.marketing.advertisement.title')}
        entityCount={1}
        isLoading={isDeleting}
      />
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function MediaPreview({
  mediaType,
  url,
  poster,
  alt,
}: {
  mediaType: AdMediaType;
  url: string;
  poster?: string;
  alt: string;
}) {
  if (mediaType === 'video') {
    return (
      <video
        src={url}
        poster={poster || undefined}
        muted
        loop
        playsInline
        controls
        className="h-40 w-full bg-muted object-cover"
      />
    );
  }
  return (
    <div className="relative h-40 w-full overflow-hidden bg-muted">
      <Image src={url} alt={alt} fill className="object-cover" />
    </div>
  );
}

function SortableAdCard({
  ad,
  aspect,
  onEdit,
  onDelete,
  onPreview,
}: {
  ad: AdvertisementDTO;
  aspect: string;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ad._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-shadow',
        isDragging ? 'z-10 border-ring shadow-lg' : 'border-border',
      )}
    >
      <div
        className="flex cursor-grab items-center justify-between border-b border-border bg-muted px-3 py-2 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span className="flex items-center gap-2 font-caption text-xs text-muted-foreground">
          <GripVertical size={14} className="text-subtle-foreground" />
          {t('admin.marketing.advertisement.position', { position: ad.position })}
        </span>
        <span className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            {ad.mediaType === 'video' ? (
              <Film className="h-3 w-3" />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )}
            {t(
              ad.mediaType === 'video'
                ? 'admin.marketing.advertisement.video'
                : 'admin.marketing.advertisement.image',
            )}
          </Badge>
          <Badge variant={ad.isActive ? 'default' : 'secondary'} className="text-xs">
            {t(
              ad.isActive
                ? 'admin.marketing.advertisement.live'
                : 'admin.marketing.advertisement.hidden',
            )}
          </Badge>
        </span>
      </div>

      <div className={cn('relative w-full bg-muted', aspect)}>
        {ad.posterImage || ad.mediaType === 'image' ? (
          <Image
            src={ad.posterImage || ad.mediaUrl}
            alt={ad.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-subtle-foreground">
            <Film className="h-8 w-8" />
          </div>
        )}
        {!ad.isActive ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="secondary">
              {t('admin.marketing.advertisement.hidden')}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-4">
        <h3 className="truncate font-navigation text-sm font-semibold text-foreground">
          {ad.title}
        </h3>
        <p className="truncate font-caption text-xs text-muted-foreground">
          {[ad.badgeTitle, ad.discountText, ad.cta?.label]
            .filter(Boolean)
            .join(' · ') || t('admin.marketing.advertisement.noOverlayCopy')}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onPreview}>
            <Eye size={14} className="mr-1" />
            {t('admin.marketing.advertisement.preview')}
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit size={14} className="mr-1" />
            {t('admin.marketing.advertisement.edit')}
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 size={14} className="mr-1" />
            {t('admin.marketing.advertisement.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Mirrors `components/home/advertisements/AdCard` so the preview stays honest. */
function StorefrontPreview({ ad }: { ad: AdvertisementDTO }) {
  const still = ad.posterImage || (ad.mediaType === 'image' ? ad.mediaUrl : '');
  const shape: AdCardShape = ad.type === 'vertical' ? 'tall' : 'wide';

  return (
    <div
      className={cn(
        'group relative w-full overflow-hidden bg-muted',
        AD_SHAPE_CLASSES[shape],
      )}
    >
      {ad.mediaType === 'video' ? (
        <video
          src={ad.mediaUrl}
          poster={still || undefined}
          muted
          loop
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : still ? (
        <Image
          src={still}
          alt={ad.title}
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-cover object-center"
        />
      ) : null}

      {/* The storefront overlay itself, so the preview cannot drift from it. */}
      <AdOverlay ad={ad} shape={shape} />
    </div>
  );
}

export default AdvertisementsPanel;
