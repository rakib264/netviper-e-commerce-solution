'use client';

import AdminSlideTable from '@/components/admin/hero-carousel/AdminSlideTable';
import SlideEditForm from '@/components/admin/hero-carousel/SlideEditForm';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HeroSlide, HeroSlideInput } from '@/lib/hero-carousel/types';
import {
  showErrorToast,
  showSuccessToast,
} from '@/lib/utils/toast-notifications';
import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function HeroCarouselAdmin() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<HeroSlide | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSlides = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`/api/admin/banners?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        showErrorToast({
          title: 'Failed to load slides',
          description: data.error || 'Please try again.',
        });
        setSlides([]);
        return;
      }
      setSlides(data.banners || []);
    } catch {
      showErrorToast({
        title: 'Failed to load slides',
        description: 'Network error.',
      });
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      loadSlides();
    }, 200);
    return () => window.clearTimeout(t);
  }, [loadSlides]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditing(slide);
    setDialogOpen(true);
  };

  const handleSave = async (values: HeroSlideInput) => {
    setSubmitting(true);
    try {
      const url = editing
        ? `/api/admin/banners/${editing._id}`
        : '/api/admin/banners';
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
          description: data.error || 'Could not save slide.',
          duration: 5000,
        });
        return;
      }
      showSuccessToast({
        title: editing ? 'Slide updated' : 'Slide created',
        description: 'Homepage carousel will reflect this change.',
      });
      setDialogOpen(false);
      setEditing(null);
      await loadSlides();
    } catch {
      showErrorToast({ title: 'Save failed', description: 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (slide: HeroSlide, next: boolean) => {
    setTogglingId(slide._id);
    // Optimistic
    setSlides((prev) =>
      prev.map((s) => (s._id === slide._id ? { ...s, isActive: next } : s))
    );
    try {
      const res = await fetch(`/api/admin/banners/${slide._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSlides((prev) =>
          prev.map((s) =>
            s._id === slide._id ? { ...s, isActive: slide.isActive } : s
          )
        );
        showErrorToast({
          title: 'Status update failed',
          description: data.error || 'Please try again.',
        });
        return;
      }
      showSuccessToast({
        title: next ? 'Slide activated' : 'Slide deactivated',
        description: next
          ? 'Now visible on the homepage carousel.'
          : 'Hidden from the homepage carousel.',
        duration: 2500,
      });
    } catch {
      setSlides((prev) =>
        prev.map((s) =>
          s._id === slide._id ? { ...s, isActive: slide.isActive } : s
        )
      );
      showErrorToast({ title: 'Status update failed', description: 'Network error.' });
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/banners/${deleting._id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      setDeleteOpen(false);
      setDeleting(null);
      if (!res.ok) {
        showErrorToast({
          title: 'Delete failed',
          description: data.error || 'Please try again.',
        });
        return;
      }
      showSuccessToast({
        title: 'Slide deleted',
        description: `"${deleting.title}" was removed.`,
      });
      await loadSlides();
    } catch {
      showErrorToast({ title: 'Delete failed', description: 'Network error.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Hero carousel
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage homepage hero slides — inactive slides are excluded immediately.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add slide
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by headline or product…"
            className="border-border pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value: 'all' | 'active' | 'inactive') => setStatus(value)}
        >
          <SelectTrigger className="w-full border-border sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminSlideTable
        slides={slides}
        loading={loading}
        togglingId={togglingId}
        onToggle={handleToggle}
        onEdit={openEdit}
        onDelete={(slide) => {
          setDeleting(slide);
          setDeleteOpen(true);
        }}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-none border-border p-0 sm:rounded-none">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
            <DialogTitle className="text-xl font-semibold text-foreground">
              {editing ? 'Edit slide' : 'Create slide'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Background, copy, CTA, and floating product card fields.
            </p>
          </DialogHeader>
          <div className="px-6 pb-6 pt-2">
            <SlideEditForm
              slide={editing}
              submitting={submitting}
              onSubmit={handleSave}
              onCancel={() => {
                setDialogOpen(false);
                setEditing(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setDeleteOpen(open);
          if (!open) setDeleting(null);
        }}
        onConfirm={confirmDelete}
        title="Delete slide"
        description={
          deleting
            ? `Delete "${deleting.title}" from the hero carousel? This cannot be undone.`
            : 'Delete this slide?'
        }
        entityName="Slide"
        entityCount={1}
        isLoading={isDeleting}
      />
    </div>
  );
}
