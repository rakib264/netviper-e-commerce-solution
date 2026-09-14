'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import CategoriesPageSkeleton from '@/components/admin/categories/CategoriesPageSkeleton';
import CategorySortTree, {
  type CategoryTreeNode,
} from '@/components/admin/categories/CategorySortTree';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  showErrorToast,
  showSuccessToast,
} from '@/lib/utils/toast-notifications';
import { Form, Formik } from 'formik';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  FolderTree,
  GripVertical,
  Layers,
  Plus,
  Tag,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { Loader } from '@/components/ui/loader';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: {
    _id: string;
    name: string;
  };
  image?: string;
  isActive: boolean;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parent: string;
  image: string;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
}

const categoryValidationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(80, 'Category name cannot exceed 80 characters')
    .required('Category name is required'),
  slug: Yup.string()
    .trim()
    .matches(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    )
    .required('Slug is required'),
  description: Yup.string().max(500, 'Description cannot exceed 500 characters').nullable(),
  parent: Yup.string().nullable(),
  image: Yup.string()
    .transform((value) => (value === '' ? undefined : value))
    .url('Please enter a valid image URL')
    .optional(),
  isActive: Yup.boolean().required(),
  metaTitle: Yup.string().max(120, 'Meta title cannot exceed 120 characters').nullable(),
  metaDescription: Yup.string()
    .max(300, 'Meta description cannot exceed 300 characters')
    .nullable(),
});

/** Close confirm dialog first so the toast isn't trapped under the overlay */
function notifyAfterDialog(show: () => void) {
  window.setTimeout(show, 80);
}

const emptyForm: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  parent: '',
  image: '',
  isActive: true,
  metaTitle: '',
  metaDescription: '',
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-sm text-destructive-600">
      <AlertCircle size={14} />
      {message}
    </p>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogViewMode, setDialogViewMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'root' | 'sub'>(
    'all'
  );
  const [formData, setFormData] = useState<CategoryFormData>(emptyForm);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
        if (data?.error) {
          showErrorToast({
            title: 'Failed to load categories',
            description: data.error,
            duration: 5000,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      showErrorToast({
        title: 'Failed to load categories',
        description: 'Please refresh and try again.',
        duration: 5000,
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingCategory(null);
    setDialogViewMode(false);
  };

  // Hierarchical tree ordered by sortOrder (drag-drop source of truth)
  const categoryTree = useMemo((): CategoryTreeNode[] => {
    const bySort = (a: Category, b: Category) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);

    const roots = categories.filter((c) => !c.parent).sort(bySort);

    return roots
      .map((root) => {
        const children = categories
          .filter((c) => c.parent?._id === root._id)
          .sort(bySort);

        return { ...root, children };
      })
      .filter((node) => {
        switch (activeFilter) {
          case 'active':
            return node.isActive || node.children.some((c) => c.isActive);
          case 'inactive':
            return !node.isActive || node.children.some((c) => !c.isActive);
          case 'root':
            return true;
          case 'sub':
            return node.children.length > 0;
          default:
            return true;
        }
      })
      .map((node) => {
        if (activeFilter === 'active') {
          return {
            ...node,
            children: node.children.filter((c) => c.isActive),
          };
        }
        if (activeFilter === 'inactive') {
          return {
            ...node,
            children: node.children.filter((c) => !c.isActive),
          };
        }
        if (activeFilter === 'root') {
          return { ...node, children: [] };
        }
        return node;
      });
  }, [categories, activeFilter]);

  const canReorder = activeFilter === 'all';

  const persistReorder = async (parentId: string | null, orderedIds: string[]) => {
    // Optimistic local update
    setCategories((prev) => {
      const next = [...prev];
      orderedIds.forEach((id, index) => {
        const i = next.findIndex((c) => c._id === id);
        if (i >= 0) next[i] = { ...next[i], sortOrder: index };
      });
      return next;
    });

    setReordering(true);
    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, orderedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast({
          title: 'Reorder failed',
          description: data.error || 'Could not save order. Refreshing…',
          duration: 5000,
        });
        await fetchCategories();
        return;
      }
      showSuccessToast({
        title: 'Order saved',
        description: parentId
          ? 'Subcategory order updated everywhere.'
          : 'Root category order updated everywhere.',
        duration: 2500,
      });
    } catch (err) {
      console.error('Reorder error:', err);
      showErrorToast({
        title: 'Reorder failed',
        description: 'Network error. Refreshing…',
        duration: 5000,
      });
      await fetchCategories();
    } finally {
      setReordering(false);
    }
  };

  const openForm = (category: Category | null, viewOnly = false) => {
    setEditingCategory(category);
    setDialogViewMode(viewOnly);
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parent: category.parent?._id || '',
        image: category.image || '',
        isActive: category.isActive,
        metaTitle: category.metaTitle || '',
        metaDescription: category.metaDescription || '',
      });
    } else {
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const name = categoryToDelete.name;
    const id = categoryToDelete._id;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      const apiMessage =
        typeof data?.error === 'string'
          ? data.error
          : typeof data?.message === 'string'
            ? data.message
            : null;

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);

      if (response.ok) {
        await fetchCategories();
        notifyAfterDialog(() =>
          showSuccessToast({
            title: 'Category deleted',
            description: `"${name}" was removed successfully.`,
            duration: 4000,
          })
        );
      } else {
        notifyAfterDialog(() =>
          showErrorToast({
            title: 'Cannot delete category',
            description:
              apiMessage ||
              'This category cannot be deleted. Move products or remove subcategories first.',
            duration: 6000,
          })
        );
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      notifyAfterDialog(() =>
        showErrorToast({
          title: 'Delete failed',
          description: 'Network error. Please try again.',
          duration: 5000,
        })
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All', count: categories.length },
    {
      key: 'active' as const,
      label: 'Active',
      count: categories.filter((c) => c.isActive).length,
    },
    {
      key: 'inactive' as const,
      label: 'Inactive',
      count: categories.filter((c) => !c.isActive).length,
    },
    {
      key: 'root' as const,
      label: 'Root',
      count: categories.filter((c) => !c.parent).length,
    },
    {
      key: 'sub' as const,
      label: 'Sub',
      count: categories.filter((c) => c.parent).length,
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <CategoriesPageSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Categories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag roots and subcategories to set the order used in the header, category pages, and menus.
            </p>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Add Category
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border-border shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{categories.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center bg-muted">
                <Tag className="h-5 w-5 text-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Root
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {categories.filter((c) => !c.parent).length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center bg-muted">
                <FolderTree className="h-5 w-5 text-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Subcategories
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {categories.filter((c) => c.parent).length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center bg-muted">
                <Layers className="h-5 w-5 text-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-foreground bg-primary text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}
              >
                {filter.label}
                <span
                  className={`text-xs ${active ? 'text-white/70' : 'text-muted-foreground'}`}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hierarchical drag-and-drop list */}
        <Card className="border-border shadow-none">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <GripVertical className="h-4 w-4 text-subtle-foreground" />
                  Category order
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canReorder
                    ? 'Drag the handle to reorder. Changes apply site-wide immediately.'
                    : 'Switch to “All” to enable drag-and-drop reordering.'}
                  {reordering ? ' Saving…' : ''}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {canReorder ? (
              <CategorySortTree
                tree={categoryTree}
                onReorder={persistReorder}
                onView={(c) => openForm(c as Category, true)}
                onEdit={(c) => openForm(c as Category, false)}
                onDelete={(c) => handleDelete(c as Category)}
                reordering={reordering}
              />
            ) : (
              <CategorySortTree
                tree={categoryTree}
                onReorder={async () => {
                  showErrorToast({
                    title: 'Reorder disabled',
                    description: 'Clear filters (select All) to change order.',
                    duration: 4000,
                  });
                }}
                onView={(c) => openForm(c as Category, true)}
                onEdit={(c) => openForm(c as Category, false)}
                onDelete={(c) => handleDelete(c as Category)}
                reordering
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit / View dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-none border-border bg-card p-0 sm:rounded-none">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
            <DialogTitle className="text-xl font-semibold text-foreground">
              {dialogViewMode
                ? 'View category'
                : editingCategory
                  ? 'Edit category'
                  : 'Create category'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {dialogViewMode
                ? 'Read-only category details.'
                : 'Same fields for create and update — name, hierarchy, image, and SEO.'}
            </p>
          </DialogHeader>

          <div className="px-6 pb-6">
          <Formik
            enableReinitialize
            initialValues={formData}
            validationSchema={categoryValidationSchema}
            onSubmit={async (values) => {
              const payload = {
                ...values,
                parent: values.parent ? values.parent : undefined,
              };
              const isEdit = Boolean(editingCategory);
              try {
                const url = editingCategory
                  ? `/api/admin/categories/${editingCategory._id}`
                  : '/api/admin/categories';
                const method = isEdit ? 'PUT' : 'POST';
                const res = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                const data = await res.json().catch(() => ({}));
                const apiMessage =
                  typeof data?.error === 'string'
                    ? data.error
                    : typeof data?.message === 'string'
                      ? data.message
                      : null;

                if (res.ok) {
                  setDialogOpen(false);
                  resetForm();
                  await fetchCategories();
                  notifyAfterDialog(() =>
                    showSuccessToast({
                      title: isEdit ? 'Category updated' : 'Category created',
                      description: `"${values.name}" was saved successfully.`,
                      duration: 4000,
                    })
                  );
                } else {
                  showErrorToast({
                    title: isEdit ? 'Update failed' : 'Create failed',
                    description:
                      apiMessage || 'Could not save category. Please try again.',
                    duration: 6000,
                  });
                }
              } catch (err) {
                console.error('Save error', err);
                showErrorToast({
                  title: isEdit ? 'Update failed' : 'Create failed',
                  description: 'Network error. Please try again.',
                  duration: 5000,
                });
              }
            }}
          >
            {({ values, errors, touched, setFieldValue, isSubmitting }) => (
              <Form className="space-y-6 pt-2">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-foreground">
                        Category name *
                      </Label>
                      <Input
                        id="name"
                        value={values.name}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          setFieldValue('name', nextName);
                          setFieldValue('slug', generateSlug(nextName));
                          if (!editingCategory || !values.metaTitle) {
                            setFieldValue('metaTitle', nextName);
                          }
                        }}
                        placeholder="Enter category name"
                        className="mt-1.5 h-11 border-border bg-card text-foreground"
                        disabled={dialogViewMode}
                      />
                      <FieldError
                        message={
                          touched.name && errors.name ? String(errors.name) : undefined
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="slug" className="text-foreground">
                        URL slug
                      </Label>
                      <Input
                        id="slug"
                        value={values.slug}
                        onChange={(e) => setFieldValue('slug', e.target.value)}
                        placeholder="category-slug"
                        className="mt-1.5 h-11 border-border bg-card font-mono text-foreground"
                        disabled={dialogViewMode}
                      />
                      <FieldError
                        message={
                          touched.slug && errors.slug ? String(errors.slug) : undefined
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="parent" className="text-foreground">
                        Parent category
                      </Label>
                      <Select
                        value={values.parent || '__root__'}
                        onValueChange={(value) =>
                          setFieldValue('parent', value === '__root__' ? '' : value)
                        }
                        disabled={dialogViewMode}
                      >
                        <SelectTrigger className="mt-1.5 h-11 border-border bg-card text-foreground">
                          <SelectValue placeholder="Select parent (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__root__">None (Root category)</SelectItem>
                          {categories
                            .filter((cat) => cat._id !== editingCategory?._id)
                            .map((category) => (
                              <SelectItem key={category._id} value={category._id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-foreground">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={values.description}
                        onChange={(e) => setFieldValue('description', e.target.value)}
                        placeholder="Short category description"
                        rows={4}
                        className="mt-1.5 resize-none border-border bg-card text-foreground"
                        disabled={dialogViewMode}
                      />
                      <FieldError
                        message={
                          touched.description && errors.description
                            ? String(errors.description)
                            : undefined
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="metaTitle" className="text-foreground">
                        Meta title
                      </Label>
                      <Input
                        id="metaTitle"
                        value={values.metaTitle}
                        onChange={(e) => setFieldValue('metaTitle', e.target.value)}
                        placeholder="SEO title"
                        className="mt-1.5 h-11 border-border bg-card text-foreground"
                        disabled={dialogViewMode}
                      />
                      <FieldError
                        message={
                          touched.metaTitle && errors.metaTitle
                            ? String(errors.metaTitle)
                            : undefined
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="metaDescription" className="text-foreground">
                        Meta description
                      </Label>
                      <Textarea
                        id="metaDescription"
                        value={values.metaDescription}
                        onChange={(e) => setFieldValue('metaDescription', e.target.value)}
                        placeholder="SEO description"
                        rows={3}
                        className="mt-1.5 resize-none border-border bg-card text-foreground"
                        disabled={dialogViewMode}
                      />
                      <FieldError
                        message={
                          touched.metaDescription && errors.metaDescription
                            ? String(errors.metaDescription)
                            : undefined
                        }
                      />
                    </div>

                    <div className="flex items-center gap-3 border border-border bg-muted px-4 py-3">
                      {dialogViewMode ? (
                        <Badge
                          variant="outline"
                          className={
                            values.isActive
                              ? 'border-foreground bg-primary text-white'
                              : 'border-border bg-card text-muted-foreground'
                          }
                        >
                          {values.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      ) : (
                        <>
                          <Switch
                            id="isActive"
                            checked={values.isActive}
                            onCheckedChange={(checked) => setFieldValue('isActive', checked)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <Label htmlFor="isActive" className="text-foreground">
                            Active on storefront
                          </Label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {(values.image || !dialogViewMode) && (
                  <div className="space-y-3 border-t border-border pt-6">
                    <Label className="text-foreground">Category image</Label>
                    {!dialogViewMode && (
                      <FileUpload
                        accept="image/*"
                        multiple={false}
                        onUpload={(url) => setFieldValue('image', url)}
                        className="w-full"
                      />
                    )}
                    {values.image && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="overflow-hidden border border-border"
                      >
                        <img
                          src={values.image}
                          alt="Category preview"
                          className="h-44 w-full object-cover"
                        />
                        {!dialogViewMode && (
                          <div className="flex justify-end border-t border-border bg-muted px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setFieldValue('image', '')}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Remove image
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}
                    <FieldError
                      message={
                        touched.image && errors.image ? String(errors.image) : undefined
                      }
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-border pt-5">
                  {dialogViewMode ? (
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Close
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                        {isSubmitting ? (
                          <Loader size="sm" label={null} className="mr-2" />
                        ) : (
                          <CheckCircle size={16} className="mr-2" />
                        )}
                        {editingCategory ? 'Update category' : 'Create category'}
                      </Button>
                    </>
                  )}
                </div>
              </Form>
            )}
          </Formik>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setDeleteDialogOpen(open);
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Delete category"
        description={
          categoryToDelete
            ? `Are you sure you want to delete "${categoryToDelete.name}"? Categories with products or subcategories cannot be deleted.`
            : 'Are you sure you want to delete this category?'
        }
        entityName="Category"
        entityCount={1}
        isLoading={isDeleting}
      />
    </AdminLayout>
  );
}
