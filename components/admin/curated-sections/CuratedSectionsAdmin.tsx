'use client';

import CuratedSectionForm from '@/components/admin/curated-sections/CuratedSectionForm';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { Switch } from '@/components/ui/switch';
import type {
  CuratedSection,
  CuratedSectionInput,
} from '@/lib/curated-sections/types';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast-notifications';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EyeOff, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SOURCE_LABEL_KEYS: Record<string, string> = {
  manual: 'admin.curatedSections.sourceManual',
  auto: 'admin.curatedSections.sourceAuto',
  hybrid: 'admin.curatedSections.sourceHybrid',
};

const VARIANT_LABEL_KEYS: Record<string, string> = {
  grid: 'admin.curatedSections.variantGrid',
  rail: 'admin.curatedSections.variantRail',
  editorial: 'admin.curatedSections.variantEditorial',
};

function SortableRow({
  section,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  section: CuratedSection;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (next: boolean) => void;
  toggling: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow sm:px-4',
        isDragging ? 'z-10 border-ring shadow-lg' : 'border-border',
        !section.isActive && 'opacity-70',
      )}
    >
      <button
        type="button"
        aria-label={section.label}
        className="cursor-grab touch-none rounded p-1 text-subtle-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-navigation text-sm font-semibold text-foreground">
            {section.label}
          </p>
          <Badge variant="outline" className="uppercase tracking-wide">
            {t(VARIANT_LABEL_KEYS[section.variant] ?? VARIANT_LABEL_KEYS.grid)}
          </Badge>
          <Badge variant="subtle">
            {t(SOURCE_LABEL_KEYS[section.sourceMode] ?? SOURCE_LABEL_KEYS.auto)}
          </Badge>
          {section.isActive ? null : (
            <Badge variant="outline">
              <EyeOff className="mr-1 h-3 w-3" />
              {t('admin.curatedSections.live')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate font-caption text-xs text-muted-foreground">
          {section.title || section.key}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={section.isActive}
          disabled={toggling}
          aria-label={t('admin.curatedSections.live')}
          onCheckedChange={onToggle}
        />
        <Button type="button" variant="outline" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CuratedSectionsAdmin() {
  const { t } = useTranslation();
  const [sections, setSections] = useState<CuratedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CuratedSection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CuratedSection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/curated-sections', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      setSections(data.sections || []);
    } catch {
      showErrorToast({ title: t('admin.curatedSections.loadFailed') });
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sections;
    return sections.filter((section) =>
      [section.label, section.title, section.key]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [sections, query]);

  const handleSave = async (values: CuratedSectionInput) => {
    setSubmitting(true);
    try {
      const response = await fetch(
        editing
          ? `/api/admin/curated-sections/${editing._id}`
          : '/api/admin/curated-sections',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        showErrorToast({
          title: t('admin.curatedSections.saveFailed'),
          description: data?.details?.join(' ') || data?.error,
        });
        return;
      }
      showSuccessToast({
        title: t(
          editing ? 'admin.curatedSections.saved' : 'admin.curatedSections.created',
        ),
      });
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch {
      showErrorToast({ title: t('admin.curatedSections.saveFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  /** Optimistic, reverted on failure. */
  const handleToggle = async (section: CuratedSection, isActive: boolean) => {
    const previous = sections;
    setTogglingId(section._id);
    setSections((current) =>
      current.map((item) =>
        item._id === section._id ? { ...item, isActive } : item,
      ),
    );
    try {
      const response = await fetch(`/api/admin/curated-sections/${section._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Request failed');
    } catch {
      setSections(previous);
      showErrorToast({ title: t('admin.curatedSections.saveFailed') });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/curated-sections/${deleting._id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Request failed');
      showSuccessToast({ title: t('admin.curatedSections.deleted') });
      setDeleting(null);
      await load();
    } catch {
      showErrorToast({ title: t('admin.curatedSections.saveFailed') });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((item) => item._id === active.id);
    const newIndex = sections.findIndex((item) => item._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = sections;
    const next = arrayMove(sections, oldIndex, newIndex);
    setSections(next);

    try {
      const response = await fetch('/api/admin/curated-sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((item) => item._id) }),
      });
      if (!response.ok) throw new Error('Request failed');
      showSuccessToast({ title: t('admin.curatedSections.orderUpdated') });
    } catch {
      setSections(previous);
      showErrorToast({ title: t('admin.curatedSections.saveFailed') });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-navigation text-2xl font-semibold tracking-tight text-foreground">
            {t('admin.curatedSections.title')}
          </h1>
          <p className="mt-1 max-w-2xl font-paragraph text-sm text-muted-foreground">
            {t('admin.curatedSections.blurb')}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.curatedSections.newSection')}
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.curatedSections.search')}
          aria-label={t('admin.curatedSections.search')}
          className="border-border pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader size="md" label={null} />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <p className="font-navigation text-sm font-medium text-foreground">
            {t('admin.curatedSections.empty')}
          </p>
          <p className="mt-1 font-paragraph text-sm text-muted-foreground">
            {t('admin.curatedSections.emptyBlurb')}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visible.map((item) => item._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {visible.map((section) => (
                <SortableRow
                  key={section._id}
                  section={section}
                  toggling={togglingId === section._id}
                  onToggle={(next) => handleToggle(section, next)}
                  onEdit={() => {
                    setEditing(section);
                    setDialogOpen(true);
                  }}
                  onDelete={() => setDeleting(section)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t(
                editing
                  ? 'admin.curatedSections.editSection'
                  : 'admin.curatedSections.createSection',
              )}
            </DialogTitle>
          </DialogHeader>
          <CuratedSectionForm
            // Keyed on the section so switching rows rebuilds the form rather
            // than reconciling into the previous section's state.
            key={editing?._id ?? 'new'}
            section={editing}
            submitting={submitting}
            onSubmit={handleSave}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('admin.curatedSections.deleteTitle')}
        description={t('admin.curatedSections.deleteBlurb')}
        entityName="section"
      />
    </div>
  );
}
