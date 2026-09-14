'use client';

import ComboBundleEditorDialog from '@/components/admin/combo-bundles/ComboBundleEditorDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToastWithTypes } from '@/hooks/use-toast';
import type { ResolvedComboBundle } from '@/lib/combo-bundles/types';
import { cn, formatEuroCurrency } from '@/lib/utils';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

function ComboRow({
  combo,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  combo: ResolvedComboBundle;
  togglingId: string | null;
  onToggle: (combo: ResolvedComboBundle, next: boolean) => void;
  onEdit: (combo: ResolvedComboBundle) => void;
  onDelete: (combo: ResolvedComboBundle) => void;
}) {
  const { t, tPlural } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: combo._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex flex-wrap items-center gap-3 border border-border bg-card px-3 py-3',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-subtle-foreground active:cursor-grabbing"
        aria-label={t('admin.marketing.combos.list.dragToReorder')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {combo.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={combo.images[0]}
          alt=""
          className="h-12 w-12 border border-border object-cover"
        />
      ) : (
        <div className="h-12 w-12 border border-border bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-navigation text-sm font-medium text-foreground">
            {combo.name}
          </p>
          <Badge
            variant="outline"
            className="border-border font-label text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            {t(
              combo.comboType === 'bundle'
                ? 'admin.marketing.combos.type.bundle'
                : 'admin.marketing.combos.type.combo',
            )}
          </Badge>
          {combo.isFeatured ? (
            <Badge
              variant="outline"
              className="border-border font-label text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              {t('admin.marketing.combos.list.featured')}
            </Badge>
          ) : null}
          {!combo.inStock ? (
            <Badge
              variant="outline"
              className="border-destructive-200 bg-destructive-50 font-label text-[10px] uppercase tracking-wide text-destructive-700"
            >
              {t('admin.marketing.combos.list.soldOut')}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 font-caption text-xs text-subtle-foreground">
          {tPlural('admin.marketing.combos.list.componentCount', combo.componentCount)}
          {' · '}
          <span className="font-price">{formatEuroCurrency(combo.price)}</span>
          {combo.savings > 0 ? (
            <>
              {' · '}
              {t('admin.marketing.combos.list.saves', {
                amount: formatEuroCurrency(combo.savings),
                percent: combo.savingsPercent,
              })}
            </>
          ) : null}
          {combo.inStock ? (
            <>
              {' · '}
              {t('admin.marketing.combos.list.unitsAvailable', { count: combo.maxUnits })}
            </>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={combo.isActive}
          disabled={togglingId === combo._id}
          onCheckedChange={(checked) => onToggle(combo, checked)}
          className="data-[state=checked]:bg-primary"
        />
        <Button asChild type="button" variant="outline" size="icon">
          <Link
            href={`/combo-bundles/${combo.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('admin.marketing.combos.list.viewOnSite')}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onEdit(combo)}
          aria-label={t('admin.marketing.combos.list.edit')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onDelete(combo)}
          aria-label={t('admin.marketing.combos.list.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Combos & bundles manager.
 *
 * Sits beside Deals, Quick Deals and Advertisements in Marketing & Deals, but
 * shares nothing with the threshold deal engine: these are catalogue entities
 * with their own price and their own page, and the list order here is the order
 * the storefront rail and listing use.
 */
export default function ComboBundlesPanel() {
  const { t } = useTranslation();
  const { success, error } = useToastWithTypes();

  const [combos, setCombos] = useState<ResolvedComboBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [comboType, setComboType] = useState<'all' | 'combo' | 'bundle'>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ResolvedComboBundle | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ResolvedComboBundle | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (comboType !== 'all') params.set('comboType', comboType);

      const response = await fetch(
        `/api/admin/combo-bundles?${params.toString()}`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok) {
        error(
          t('admin.marketing.combos.toasts.loadFailedTitle'),
          data.error || t('admin.marketing.combos.toasts.loadFailedBody'),
        );
        setCombos([]);
        return;
      }
      setCombos(data.comboBundles || []);
    } catch {
      error(
        t('admin.marketing.combos.toasts.loadFailedTitle'),
        t('admin.marketing.combos.toasts.loadFailedBody'),
      );
      setCombos([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, comboType]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleToggle = async (combo: ResolvedComboBundle, next: boolean) => {
    setTogglingId(combo._id);
    try {
      const response = await fetch(`/api/admin/combo-bundles/${combo._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!response.ok) throw new Error();
      setCombos((current) =>
        current.map((entry) =>
          entry._id === combo._id ? { ...entry, isActive: next } : entry,
        ),
      );
    } catch {
      error(
        t('admin.marketing.combos.toasts.toggleFailedTitle'),
        t('admin.marketing.combos.toasts.toggleFailedBody'),
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/combo-bundles/${deleting._id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error();
      success(t('admin.marketing.combos.toasts.deletedTitle'));
      setDeleteOpen(false);
      setDeleting(null);
      await load();
    } catch {
      error(
        t('admin.marketing.combos.toasts.deleteFailedTitle'),
        t('admin.marketing.combos.toasts.deleteFailedBody'),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = combos.findIndex((combo) => combo._id === active.id);
    const newIndex = combos.findIndex((combo) => combo._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(combos, oldIndex, newIndex);
    setCombos(next);

    try {
      const response = await fetch('/api/admin/combo-bundles/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((combo) => combo._id) }),
      });
      if (!response.ok) throw new Error();
    } catch {
      error(
        t('admin.marketing.combos.toasts.reorderFailedTitle'),
        t('admin.marketing.combos.toasts.reorderFailedBody'),
      );
      await load();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl font-paragraph text-sm text-muted-foreground">
          {t('admin.marketing.combos.subtitle')}
        </p>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          className="sm:shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.marketing.combos.newOffer')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.marketing.combos.list.searchPlaceholder')}
            className="border-border pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger
            className="w-full border-border sm:w-40"
            aria-label={t('admin.marketing.combos.list.statusFilter')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.marketing.combos.list.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('admin.marketing.combos.list.active')}</SelectItem>
            <SelectItem value="inactive">{t('admin.marketing.combos.list.inactive')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={comboType}
          onValueChange={(value) => setComboType(value as typeof comboType)}
        >
          <SelectTrigger
            className="w-full border-border sm:w-40"
            aria-label={t('admin.marketing.combos.list.typeFilter')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.marketing.combos.list.allTypes')}</SelectItem>
            <SelectItem value="combo">{t('admin.marketing.combos.type.combo')}</SelectItem>
            <SelectItem value="bundle">{t('admin.marketing.combos.type.bundle')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        /* The list is sortable rows, not a table: handle, 48px image, name
           with a type badge, then the toggle and action buttons. */
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-3 border border-border bg-card px-3 py-3"
            >
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-60 max-w-full" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
              <div className="flex shrink-0 items-center gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      ) : combos.length === 0 ? (
        <div className="border border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-navigation text-sm font-medium text-foreground">
            {t('admin.marketing.combos.list.emptyTitle')}
          </p>
          <p className="mt-1 font-paragraph text-sm text-muted-foreground">
            {t('admin.marketing.combos.list.emptyBody')}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={combos.map((combo) => combo._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {combos.map((combo) => (
                <ComboRow
                  key={combo._id}
                  combo={combo}
                  togglingId={togglingId}
                  onToggle={handleToggle}
                  onEdit={(next) => {
                    setEditing(next);
                    setEditorOpen(true);
                  }}
                  onDelete={(next) => {
                    setDeleting(next);
                    setDeleteOpen(true);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ComboBundleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        combo={editing}
        onSaved={load}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('admin.marketing.combos.confirm.deleteTitle')}
        description={t('admin.marketing.combos.confirm.deleteBody', {
          name: deleting?.name || '',
        })}
        entityName={t('admin.marketing.combos.confirm.entityName')}
      />
    </div>
  );
}
