'use client';

import DataTable from '@/components/admin/DataTable';
import { AdminDataTableSkeleton } from '@/components/admin/ui/hero-page-skeleton';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import EventPreview from '@/components/events/EventPreview';
import ActionConfirmationDialog from '@/components/ui/action-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DateTimePicker from '@/components/ui/datetime-picker';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FileUpload from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductSelector from '@/components/ui/product-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToastWithTypes } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Package, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Event {
  _id: string;
  title: string;
  subtitle?: string;
  bannerImage?: string;
  discountText: string;
  layoutType: 'horizontal' | 'vertical';
  cta?: {
    label: string;
    url: string;
    openInNewTab: boolean;
  };
  showInLanding: boolean;
  startDate: string;
  endDate: string;
  products: Array<{
    _id: string;
    name: string;
    thumbnailImage?: string;
    price: number;
    comparePrice?: number;
    slug: string;
  }>;
  productsCount: number;
  isActive: boolean;
  status: 'active' | 'upcoming' | 'expired' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  title: string;
  subtitle: string;
  bannerImage: string;
  discountText: string;
  layoutType: 'horizontal' | 'vertical';
  enableCta: boolean;
  cta?: {
    label: string;
    url: string;
    openInNewTab: boolean;
  };
  showInLanding: boolean;
  startDate: Date | undefined;
  endDate: Date | undefined;
  products: string[];
  isActive: boolean;
  status?: 'active' | 'upcoming' | 'expired' | 'inactive';
}

const emptyForm = (): EventFormData => ({
  title: '',
  subtitle: '',
  bannerImage: '',
  discountText: '',
  layoutType: 'horizontal',
  enableCta: false,
  cta: { label: '', url: '', openInNewTab: false },
  showInLanding: false,
  startDate: undefined,
  endDate: undefined,
  products: [],
  isActive: true,
  status: 'active',
});

const STATUS_TONE: Record<Event['status'], string> = {
  active: 'border-success-200 bg-success-50 text-success-700',
  upcoming: 'border-info-200 bg-info-50 text-info-700',
  expired: 'border-border bg-muted text-muted-foreground',
  inactive: 'border-destructive-200 bg-destructive-50 text-destructive-700',
};

/**
 * Banner field for an event.
 *
 * An uploaded banner used to leave the dropzone sitting above a preview with no
 * way to swap or clear it — the only route back was to re-upload over the top
 * and hope. Once an image exists the dropzone collapses behind an explicit
 * Replace, and Remove clears the field, with the preview staying put through
 * both so an admin can always see what is attached.
 */
function EventBannerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { t } = useTranslation();
  const [replacing, setReplacing] = useState(false);

  /* A freshly attached image closes the picker rather than leaving it open. */
  useEffect(() => {
    setReplacing(false);
  }, [value]);

  const showDropzone = !value || replacing;

  return (
    <div>
      <Label>{t('admin.marketing.quickDeals.form.banner')}</Label>

      {value ? (
        <div className="mt-2 space-y-2">
          <div className="relative h-40 overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={t('admin.marketing.quickDeals.form.bannerPreviewAlt')}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReplacing((current) => !current)}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {t('admin.marketing.quickDeals.form.replaceBanner')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange('')}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t('admin.marketing.quickDeals.form.removeBanner')}
            </Button>
          </div>
        </div>
      ) : null}

      {showDropzone ? (
        <FileUpload
          accept="image/*"
          onUpload={(url) => onChange(url)}
          className="mt-2"
        />
      ) : null}

      <p className="mt-1 font-caption text-xs text-muted-foreground">
        {t('admin.marketing.quickDeals.form.bannerHint')}
      </p>
    </div>
  );
}

export default function QuickDealsPanel() {
  const { t, tPlural } = useTranslation();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | undefined>(
    'desc',
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    expired: 0,
  });

  const { success, error } = useToastWithTypes();
  // `useToastWithTypes` returns fresh identities every render, so it is held in
  // a ref rather than listed as an effect dependency.
  const notify = useRef({ success, error });
  notify.current = { success, error };

  const [showEditor, setShowEditor] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    null | 'activate' | 'deactivate' | 'delete'
  >(null);
  const [pendingRows, setPendingRows] = useState<Event[]>([]);

  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  /* Debounce the search box; filters and paging fire immediately. */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (sortKey && sortDirection) {
        params.set('sortBy', sortKey);
        params.set('sortOrder', sortDirection);
      }

      const { status, dateFrom, dateTo } = filterValues;
      if (status) params.set('status', status);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/admin/events?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'request failed');

      const rows: Event[] = data.events || [];
      setEvents(rows);
      setTotal(data.pagination?.total || 0);
      setStats({
        total: data.pagination?.total || 0,
        active: rows.filter((event) => event.status === 'active').length,
        upcoming: rows.filter((event) => event.status === 'upcoming').length,
        expired: rows.filter((event) => event.status === 'expired').length,
      });
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        notify.current.error(
          t('admin.marketing.quickDeals.toasts.loadFailedTitle'),
          t('admin.marketing.quickDeals.toasts.loadFailedBody'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, sortKey, sortDirection, filterValues]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusLabel = (status: string) =>
    t(`admin.marketing.quickDeals.status.${status}`);

  const openCreate = () => {
    setEditingEvent(null);
    setFormData(emptyForm());
    setFormErrors({});
    setShowEditor(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = t('admin.marketing.quickDeals.errors.title');
    }
    if (!formData.discountText.trim()) {
      errors.discountText = t('admin.marketing.quickDeals.errors.discount');
    }
    if (!formData.startDate) {
      errors.startDate = t('admin.marketing.quickDeals.errors.start');
    }
    if (!formData.endDate) {
      errors.endDate = t('admin.marketing.quickDeals.errors.end');
    }
    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate >= formData.endDate
    ) {
      errors.endDate = t('admin.marketing.quickDeals.errors.endBeforeStart');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        subtitle: formData.subtitle,
        bannerImage: formData.bannerImage,
        discountText: formData.discountText,
        layoutType: formData.layoutType,
        showInLanding: formData.showInLanding,
        startDate: formData.startDate?.toISOString(),
        endDate: formData.endDate?.toISOString(),
        products: formData.products,
        isActive: formData.isActive,
      };

      payload.cta =
        formData.enableCta && formData.cta?.label && formData.cta?.url
          ? {
              label: formData.cta.label,
              url: formData.cta.url,
              openInNewTab: formData.cta.openInNewTab,
            }
          : null;

      const url = editingEvent
        ? `/api/admin/events/${editingEvent._id}`
        : '/api/admin/events';
      const response = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details?.join(', ') || data.error || '');
      }

      success(
        editingEvent
          ? t('admin.marketing.quickDeals.toasts.updatedTitle')
          : t('admin.marketing.quickDeals.toasts.createdTitle'),
        editingEvent
          ? t('admin.marketing.quickDeals.toasts.updatedBody')
          : t('admin.marketing.quickDeals.toasts.createdBody'),
      );

      setShowEditor(false);
      setEditingEvent(null);
      setFormData(emptyForm());
      setFormErrors({});
      fetchEvents();
    } catch (err) {
      error(
        t('admin.marketing.quickDeals.toasts.saveFailedTitle'),
        (err as Error)?.message ||
          t('admin.marketing.quickDeals.toasts.saveFailedBody'),
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleView = (event: Event) => {
    setPreviewEvent(event);
    setShowPreviewDialog(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      subtitle: event.subtitle || '',
      bannerImage: event.bannerImage || '',
      discountText: event.discountText,
      layoutType: event.layoutType || 'horizontal',
      enableCta: Boolean(event.cta),
      cta: event.cta || { label: '', url: '', openInNewTab: false },
      showInLanding: event.showInLanding || false,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      products: event.products.map((product) => product._id),
      isActive: event.isActive,
      status: event.status,
    });
    setFormErrors({});
    setShowEditor(true);
  };

  const handleDelete = (event: Event) => {
    setPendingAction('delete');
    setPendingRows([event]);
    setConfirmOpen(true);
  };

  const performBulkStatus = async (rows: Event[], isActive: boolean) => {
    const ids = rows.map((row) => row._id);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, isActive }),
      });
      if (!res.ok) throw new Error();

      success(
        isActive
          ? t('admin.marketing.quickDeals.toasts.activatedTitle')
          : t('admin.marketing.quickDeals.toasts.deactivatedTitle'),
        isActive
          ? tPlural('admin.marketing.quickDeals.toasts.activatedBody', ids.length)
          : tPlural(
              'admin.marketing.quickDeals.toasts.deactivatedBody',
              ids.length,
            ),
      );
      await fetchEvents();
    } catch {
      await fetchEvents();
      error(
        t('admin.marketing.quickDeals.toasts.actionFailedTitle'),
        t('admin.marketing.quickDeals.toasts.actionFailedBody'),
      );
    }
  };

  const performBulkDelete = async (rows: Event[]) => {
    const ids = rows.map((row) => row._id);
    try {
      // Optimistic: the rows go straight away, and a failure re-reads the list.
      setEvents((previous) => previous.filter((row) => !ids.includes(row._id)));
      setTotal((current) => Math.max(0, current - ids.length));

      const res = await fetch('/api/admin/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        await fetchEvents();
        return;
      }
      success(
        t('admin.marketing.quickDeals.toasts.deletedTitle'),
        tPlural('admin.marketing.quickDeals.toasts.deletedBody', ids.length),
      );
    } catch {
      await fetchEvents();
      error(
        t('admin.marketing.quickDeals.toasts.deleteFailedTitle'),
        t('admin.marketing.quickDeals.toasts.deleteFailedBody'),
      );
    }
  };

  const onConfirmAction = async () => {
    if (!pendingAction || pendingRows.length === 0) return;
    setIsConfirming(true);
    try {
      if (pendingAction === 'delete') await performBulkDelete(pendingRows);
      if (pendingAction === 'activate') await performBulkStatus(pendingRows, true);
      if (pendingAction === 'deactivate') {
        await performBulkStatus(pendingRows, false);
      }
    } finally {
      setIsConfirming(false);
      setConfirmOpen(false);
      setActionConfirmOpen(false);
      setPendingAction(null);
      setPendingRows([]);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'bannerImage',
        label: t('admin.marketing.quickDeals.table.banner'),
        render: (value: string, row: Event) => (
          <div className="h-10 w-16 overflow-hidden border border-border bg-muted">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt={row.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package size={12} className="text-subtle-foreground" />
              </div>
            )}
          </div>
        ),
        width: '80px',
      },
      {
        key: 'title',
        label: t('admin.marketing.quickDeals.table.title'),
        sortable: true,
        render: (value: string, row: Event) => (
          <div>
            <p className="font-navigation text-sm font-medium text-foreground">
              {value}
            </p>
            {row.subtitle ? (
              <p className="font-caption text-xs text-muted-foreground">
                {row.subtitle}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'discountText',
        label: t('admin.marketing.quickDeals.table.discount'),
        render: (value: string) => (
          <Badge variant="outline" className="border-border font-label text-xs">
            {value}
          </Badge>
        ),
      },
      {
        key: 'startDate',
        label: t('admin.marketing.quickDeals.table.start'),
        sortable: true,
        render: (value: string) => (
          <span className="font-caption text-xs text-muted-foreground">
            {formatDate(value)}
          </span>
        ),
      },
      {
        key: 'endDate',
        label: t('admin.marketing.quickDeals.table.end'),
        sortable: true,
        render: (value: string) => (
          <span className="font-caption text-xs text-muted-foreground">
            {formatDate(value)}
          </span>
        ),
      },
      {
        key: 'productsCount',
        label: t('admin.marketing.quickDeals.table.products'),
        sortable: true,
        render: (value: number) => (
          <span className="font-price text-sm text-foreground">{value}</span>
        ),
      },
      {
        key: 'status',
        label: t('admin.marketing.quickDeals.table.status'),
        filterable: true,
        render: (value: Event['status']) => (
          <Badge
            variant="outline"
            className={cn('font-label text-[10px] uppercase', STATUS_TONE[value])}
          >
            {statusLabel(value)}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        label: t('admin.marketing.quickDeals.table.created'),
        sortable: true,
        render: (value: string) => (
          <span className="font-caption text-xs text-subtle-foreground">
            {formatDate(value)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const filters = useMemo(
    () => [
      {
        key: 'status',
        label: t('admin.marketing.quickDeals.filters.status'),
        options: (['active', 'upcoming', 'expired', 'inactive'] as const).map(
          (value) => ({ label: statusLabel(value), value }),
        ),
      },
      {
        type: 'dateRange' as const,
        label: t('admin.marketing.quickDeals.filters.dateRange'),
        fromKey: 'dateFrom',
        toKey: 'dateTo',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const bulkActions = [
    {
      label: t('admin.marketing.quickDeals.bulk.activate'),
      action: (rows: Event[]) => {
        setPendingAction('activate');
        setPendingRows(rows);
        setActionConfirmOpen(true);
      },
    },
    {
      label: t('admin.marketing.quickDeals.bulk.deactivate'),
      action: (rows: Event[]) => {
        setPendingAction('deactivate');
        setPendingRows(rows);
        setActionConfirmOpen(true);
      },
    },
    {
      label: t('admin.marketing.quickDeals.bulk.delete'),
      action: (rows: Event[]) => {
        setPendingAction('delete');
        setPendingRows(rows);
        setConfirmOpen(true);
      },
      variant: 'destructive' as const,
    },
  ];

  const statCards = [
    {
      key: 'total',
      value: stats.total,
      label: t('admin.marketing.quickDeals.stats.total'),
      hint: t('admin.marketing.quickDeals.stats.totalHint'),
    },
    {
      key: 'active',
      value: stats.active,
      label: t('admin.marketing.quickDeals.stats.active'),
      hint: t('admin.marketing.quickDeals.stats.activeHint'),
    },
    {
      key: 'upcoming',
      value: stats.upcoming,
      label: t('admin.marketing.quickDeals.stats.upcoming'),
      hint: t('admin.marketing.quickDeals.stats.upcomingHint'),
    },
    {
      key: 'expired',
      value: stats.expired,
      label: t('admin.marketing.quickDeals.stats.expired'),
      hint: t('admin.marketing.quickDeals.stats.expiredHint'),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl font-paragraph text-sm text-muted-foreground">
          {t('admin.marketing.quickDeals.subtitle')}
        </p>
        <Button type="button" onClick={openCreate} className="sm:shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.marketing.quickDeals.createEvent')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.key} className="border border-border bg-card p-4">
            <p className="font-label text-[11px] uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1 font-price text-2xl text-foreground">
              {card.value}
            </p>
            <p className="mt-0.5 font-caption text-xs text-subtle-foreground">
              {card.hint}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="border border-border bg-card p-4 sm:p-5">
          <AdminDataTableSkeleton
            rows={6}
            columnWidths={['w-40', 'w-24', 'w-28', 'w-24', 'w-20', 'w-24']}
          />
        </div>
      ) : (
        <div className="border border-border bg-card p-4 sm:p-5">
          <DataTable
            data={events}
            columns={columns}
            filters={filters}
            bulkActions={bulkActions}
            selectable
            exportable
            serverSearch={{
              value: searchInput,
              onChange: (value) => setSearchInput(value),
            }}
            serverFilters={{
              values: filterValues,
              onChange: (values) => {
                setFilterValues(values);
                setPage(1);
              },
            }}
            serverSort={{
              sortKey,
              sortDirection: sortDirection as 'asc' | 'desc' | undefined,
              onChange: (key, direction) => {
                setSortKey(key);
                setSortDirection(direction);
                setPage(1);
              },
            }}
            serverPagination={{
              page,
              pageSize: limit,
              total,
              onPageChange: (next) => setPage(next),
              onPageSizeChange: (size) => {
                setLimit(size);
                setPage(1);
              },
              pageSizeOptions: [5, 10, 25, 50],
            }}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingEvent
                ? t('admin.marketing.quickDeals.dialog.editTitle')
                : t('admin.marketing.quickDeals.dialog.createTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="qd-title">
                  {t('admin.marketing.quickDeals.form.title')}
                </Label>
                <Input
                  id="qd-title"
                  value={formData.title}
                  onChange={(event) =>
                    setFormData({ ...formData, title: event.target.value })
                  }
                  placeholder={t(
                    'admin.marketing.quickDeals.form.titlePlaceholder',
                  )}
                />
                {formErrors.title ? (
                  <p className="mt-1 font-caption text-xs text-destructive-600">
                    {formErrors.title}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="qd-subtitle">
                  {t('admin.marketing.quickDeals.form.subtitle')}
                </Label>
                <Input
                  id="qd-subtitle"
                  value={formData.subtitle}
                  onChange={(event) =>
                    setFormData({ ...formData, subtitle: event.target.value })
                  }
                  placeholder={t(
                    'admin.marketing.quickDeals.form.subtitlePlaceholder',
                  )}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="qd-discount">
                {t('admin.marketing.quickDeals.form.discount')}
              </Label>
              <Input
                id="qd-discount"
                value={formData.discountText}
                onChange={(event) =>
                  setFormData({ ...formData, discountText: event.target.value })
                }
                placeholder={t(
                  'admin.marketing.quickDeals.form.discountPlaceholder',
                )}
              />
              {formErrors.discountText ? (
                <p className="mt-1 font-caption text-xs text-destructive-600">
                  {formErrors.discountText}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="qd-layout">
                  {t('admin.marketing.quickDeals.form.layout')}
                </Label>
                <Select
                  value={formData.layoutType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      layoutType: value as 'horizontal' | 'vertical',
                    })
                  }
                >
                  <SelectTrigger id="qd-layout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">
                      {t('admin.marketing.quickDeals.form.layoutHorizontal')}
                    </SelectItem>
                    <SelectItem value="vertical">
                      {t('admin.marketing.quickDeals.form.layoutVertical')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 font-caption text-xs text-muted-foreground">
                  {t('admin.marketing.quickDeals.form.layoutHint')}
                </p>
              </div>

              <div className="flex items-center justify-between border border-border p-4">
                <div className="space-y-1 pr-3">
                  <Label htmlFor="qd-landing" className="font-medium">
                    {t('admin.marketing.quickDeals.form.showInLanding')}
                  </Label>
                  <p className="font-caption text-xs text-muted-foreground">
                    {t('admin.marketing.quickDeals.form.showInLandingHint')}
                  </p>
                </div>
                <Switch
                  id="qd-landing"
                  checked={formData.showInLanding}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, showInLanding: checked })
                  }
                />
              </div>
            </div>

            <EventBannerField
              value={formData.bannerImage}
              onChange={(url) => setFormData({ ...formData, bannerImage: url })}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="qd-start">
                  {t('admin.marketing.quickDeals.form.start')}
                </Label>
                <DateTimePicker
                  selected={formData.startDate}
                  onChange={(date) =>
                    setFormData({ ...formData, startDate: date || undefined })
                  }
                  placeholder={t(
                    'admin.marketing.quickDeals.form.startPlaceholder',
                  )}
                  error={Boolean(formErrors.startDate)}
                />
                {formErrors.startDate ? (
                  <p className="mt-1 font-caption text-xs text-destructive-600">
                    {formErrors.startDate}
                  </p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="qd-end">
                  {t('admin.marketing.quickDeals.form.end')}
                </Label>
                <DateTimePicker
                  selected={formData.endDate}
                  onChange={(date) =>
                    setFormData({ ...formData, endDate: date || undefined })
                  }
                  placeholder={t('admin.marketing.quickDeals.form.endPlaceholder')}
                  error={Boolean(formErrors.endDate)}
                />
                {formErrors.endDate ? (
                  <p className="mt-1 font-caption text-xs text-destructive-600">
                    {formErrors.endDate}
                  </p>
                ) : null}
              </div>
            </div>

            <ProductSelector
              selectedProducts={formData.products}
              onProductsChange={(products) =>
                setFormData({ ...formData, products })
              }
              placeholder={t('admin.marketing.quickDeals.form.productsPlaceholder')}
            />

            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1 pr-3">
                  <Label htmlFor="qd-cta" className="font-medium">
                    {t('admin.marketing.quickDeals.form.ctaToggle')}
                  </Label>
                  <p className="font-caption text-xs text-muted-foreground">
                    {t('admin.marketing.quickDeals.form.ctaToggleHint')}
                  </p>
                </div>
                <Switch
                  id="qd-cta"
                  checked={formData.enableCta}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableCta: checked })
                  }
                />
              </div>

              {formData.enableCta ? (
                <div className="space-y-4 border-l-2 border-border pl-4">
                  <div>
                    <Label htmlFor="qd-cta-label">
                      {t('admin.marketing.quickDeals.form.ctaLabel')}
                    </Label>
                    <Input
                      id="qd-cta-label"
                      value={formData.cta?.label || ''}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          cta: {
                            ...(formData.cta || {
                              label: '',
                              url: '',
                              openInNewTab: false,
                            }),
                            label: event.target.value,
                          },
                        })
                      }
                      placeholder={t(
                        'admin.marketing.quickDeals.form.ctaLabelPlaceholder',
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="qd-cta-url">
                      {t('admin.marketing.quickDeals.form.ctaUrl')}
                    </Label>
                    <Input
                      id="qd-cta-url"
                      value={formData.cta?.url || ''}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          cta: {
                            ...(formData.cta || {
                              label: '',
                              url: '',
                              openInNewTab: false,
                            }),
                            url: event.target.value,
                          },
                        })
                      }
                      placeholder={t(
                        'admin.marketing.quickDeals.form.ctaUrlPlaceholder',
                      )}
                    />
                    <p className="mt-1 font-caption text-xs text-muted-foreground">
                      {t('admin.marketing.quickDeals.form.ctaUrlHint')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="qd-cta-tab"
                      checked={formData.cta?.openInNewTab || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          cta: {
                            ...(formData.cta || {
                              label: '',
                              url: '',
                              openInNewTab: false,
                            }),
                            openInNewTab: checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor="qd-cta-tab" className="cursor-pointer">
                      {t('admin.marketing.quickDeals.form.ctaNewTab')}
                    </Label>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <Label htmlFor="qd-status">
                {t('admin.marketing.quickDeals.form.status')}
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as Event['status'],
                    // Kept in step with the status the admin picked: an event
                    // marked inactive must not stay live.
                    isActive: value !== 'inactive',
                  })
                }
              >
                <SelectTrigger id="qd-status" className="md:w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['active', 'upcoming', 'expired', 'inactive'] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {statusLabel(value)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <p className="mt-1 font-caption text-xs text-muted-foreground">
                {t('admin.marketing.quickDeals.form.statusHint')}
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditor(false)}
                disabled={formLoading}
              >
                {t('admin.marketing.quickDeals.form.cancel')}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={formLoading}>
                {formLoading
                  ? t('admin.marketing.quickDeals.form.saving')
                  : editingEvent
                    ? t('admin.marketing.quickDeals.form.update')
                    : t('admin.marketing.quickDeals.form.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>
              {t('admin.marketing.quickDeals.preview.title')}
            </DialogTitle>
          </DialogHeader>
          {previewEvent ? (
            <div className="py-2">
              <EventPreview event={previewEvent} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={onConfirmAction}
        title={tPlural(
          'admin.marketing.quickDeals.confirm.deleteTitle',
          pendingRows.length,
        )}
        description={t('admin.marketing.quickDeals.confirm.deleteBody')}
        entityName={t('admin.marketing.quickDeals.confirm.entityName')}
        entityCount={pendingRows.length}
        isLoading={isConfirming}
      />

      <ActionConfirmationDialog
        open={actionConfirmOpen && pendingAction !== 'delete'}
        onOpenChange={setActionConfirmOpen}
        onConfirm={onConfirmAction}
        title={
          pendingAction === 'activate'
            ? tPlural(
                'admin.marketing.quickDeals.confirm.activateTitle',
                pendingRows.length,
              )
            : tPlural(
                'admin.marketing.quickDeals.confirm.deactivateTitle',
                pendingRows.length,
              )
        }
        description={
          pendingAction === 'activate'
            ? t('admin.marketing.quickDeals.confirm.activateBody')
            : t('admin.marketing.quickDeals.confirm.deactivateBody')
        }
        confirmLabel={
          pendingAction === 'activate'
            ? t('admin.marketing.quickDeals.bulk.activate')
            : t('admin.marketing.quickDeals.bulk.deactivate')
        }
        isLoading={isConfirming}
        tone={pendingAction === 'activate' ? 'success' : 'warning'}
      />
    </div>
  );
}
