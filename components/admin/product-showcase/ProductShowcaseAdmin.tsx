'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import ShowcaseEditForm from '@/components/admin/product-showcase/ShowcaseEditForm';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  resolveShowcaseTemplate,
  templateLabelKey,
  type ShowcaseSection,
  type ShowcaseSectionInput,
} from '@/lib/product-showcase/types';
import {
  showErrorToast,
  showSuccessToast,
} from '@/lib/utils/toast-notifications';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';

function SortableRow({
  section,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  section: ShowcaseSection;
  togglingId: string | null;
  onToggle: (section: ShowcaseSection, next: boolean) => void;
  onEdit: (section: ShowcaseSection) => void;
  onDelete: (section: ShowcaseSection) => void;
}) {
  const { t, tPlural } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Resolved, not compared: a section whose template was written in another
  // spelling was badged — and summarised — as a product showcase, which is
  // exactly the row an admin then opens expecting the split-media form.
  const template = resolveShowcaseTemplate(section.template, null, {
    splitLeft: section.splitLeft,
    splitRight: section.splitRight,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border border-border bg-card px-3 py-3 ${
        isDragging ? 'z-10 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-subtle-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{section.title}</p>
          <Badge
            variant="outline"
            className="border-border text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            {t(templateLabelKey(template))}
          </Badge>
          <Badge
            variant="outline"
            className="border-border text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            {section.cardStyle}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-subtle-foreground">
          {template === 'product_showcase'
            ? tPlural('admin.showcase.tabCount', section.tabs?.length || 0)
            : t('admin.showcase.twoPanelCampaign')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={section.isActive}
          disabled={togglingId === section._id}
          onCheckedChange={(checked) => onToggle(section, checked)}
          className="data-[state=checked]:bg-primary"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => onEdit(section)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onDelete(section)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ProductShowcaseAdmin() {
  const [sections, setSections] = useState<ShowcaseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShowcaseSection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<ShowcaseSection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`/api/admin/product-showcase?${params}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorToast({
          title: 'Failed to load',
          description: data.error || 'Please try again.',
        });
        setSections([]);
        return;
      }
      setSections(data.sections || []);
    } catch {
      showErrorToast({ title: 'Failed to load', description: 'Network error.' });
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = window.setTimeout(() => loadSections(), 200);
    return () => window.clearTimeout(t);
  }, [loadSections]);

  const handleSave = async (values: ShowcaseSectionInput) => {
    setSubmitting(true);
    try {
      const url = editing
        ? `/api/admin/product-showcase/${editing._id}`
        : '/api/admin/product-showcase';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast({
          title: 'Save failed',
          description: data.error || 'Could not save section.',
        });
        return;
      }
      showSuccessToast({
        title: editing ? 'Section updated' : 'Section created',
        description: 'Landing page will reflect this change.',
      });
      setDialogOpen(false);
      setEditing(null);
      await loadSections();
    } catch {
      showErrorToast({ title: 'Save failed', description: 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (section: ShowcaseSection, next: boolean) => {
    setTogglingId(section._id);
    try {
      const res = await fetch(`/api/admin/product-showcase/${section._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        showErrorToast({ title: 'Update failed', description: 'Could not toggle.' });
        return;
      }
      setSections((prev) =>
        prev.map((s) => (s._id === section._id ? { ...s, isActive: next } : s))
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/product-showcase/${deleting._id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        showErrorToast({ title: 'Delete failed', description: 'Please try again.' });
        return;
      }
      showSuccessToast({ title: 'Section deleted' });
      setDeleteOpen(false);
      setDeleting(null);
      await loadSections();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s._id === active.id);
    const newIndex = sections.findIndex((s) => s._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(sections, oldIndex, newIndex);
    setSections(next);

    try {
      const res = await fetch('/api/admin/product-showcase/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((s) => s._id) }),
      });
      if (!res.ok) {
        showErrorToast({ title: 'Reorder failed', description: 'Reloading…' });
        await loadSections();
      }
    } catch {
      await loadSections();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Product showcase
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable showcase carousels and split-media templates for the landing page.
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
          New section
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections…"
            className="border-border pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <SelectTrigger className="w-full border-border sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader size="md" label={null} className="mr-2" />
          Loading sections…
        </div>
      ) : sections.length === 0 ? (
        <div className="border border-border bg-muted px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">No showcase sections yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a Product Showcase or Split Media template to get started.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sections.map((section) => (
                <SortableRow
                  key={section._id}
                  section={section}
                  togglingId={togglingId}
                  onToggle={handleToggle}
                  onEdit={(s) => {
                    setEditing(s);
                    setDialogOpen(true);
                  }}
                  onDelete={(s) => {
                    setDeleting(s);
                    setDeleteOpen(true);
                  }}
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
              {editing ? 'Edit showcase section' : 'New showcase section'}
            </DialogTitle>
          </DialogHeader>
          <ShowcaseEditForm
            // Keyed on the section so switching rows rebuilds the form from
            // scratch rather than reconciling into the previous section's state.
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
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete section?"
        description={`Remove “${deleting?.title || 'this section'}” from the landing page.`}
        entityName="section"
      />
    </div>
  );
}
