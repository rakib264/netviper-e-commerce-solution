'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  ChevronDown,
  ChevronRight,
  Eye,
  GripVertical,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export interface SortableCategory {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  isActive: boolean;
  sortOrder?: number;
  productCount?: number;
  parent?: {
    _id: string;
    name: string;
  };
}

export interface CategoryTreeNode extends SortableCategory {
  children: SortableCategory[];
}

function SortableItem({
  category,
  depth,
  expanded,
  onToggleExpand,
  hasChildren,
  onView,
  onEdit,
  onDelete,
}: {
  category: SortableCategory;
  depth: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  hasChildren?: boolean;
  onView: (category: SortableCategory) => void;
  onEdit: (category: SortableCategory) => void;
  onDelete: (category: SortableCategory) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 border border-border bg-card px-3 py-2.5 ${
        isDragging ? 'z-10 opacity-90 shadow-md' : ''
      } ${depth > 0 ? 'bg-background' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-subtle-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}

      {category.image ? (
        <img
          src={category.image}
          alt=""
          className="h-9 w-9 object-cover border border-border"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center border border-border bg-muted">
          <Tag size={14} className="text-muted-foreground" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
          <Badge
            variant="outline"
            className={
              category.isActive
                ? 'border-foreground bg-primary text-[10px] text-white'
                : 'border-border bg-muted text-[10px] text-muted-foreground'
            }
          >
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {depth === 0 && (
            <span className="text-[10px] font-label uppercase tracking-wide text-subtle-foreground">Root</span>
          )}
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          /{category.slug}
          {typeof category.productCount === 'number'
            ? ` · ${category.productCount} product${category.productCount === 1 ? '' : 's'}`
            : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onView(category)}
          aria-label="View"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(category)}
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(category)}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4 text-destructive-500" />
        </Button>
      </div>
    </div>
  );
}

function ChildList({
  parentId,
  items,
  onReorder,
  onView,
  onEdit,
  onDelete,
  reordering,
}: {
  parentId: string;
  items: SortableCategory[];
  onReorder: (parentId: string | null, orderedIds: string[]) => Promise<void>;
  onView: (category: SortableCategory) => void;
  onEdit: (category: SortableCategory) => void;
  onDelete: (category: SortableCategory) => void;
  reordering: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => items.map((c) => c._id), [items]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || reordering) return;

    const oldIndex = items.findIndex((c) => c._id === active.id);
    const newIndex = items.findIndex((c) => c._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    await onReorder(
      parentId,
      reordered.map((c) => c._id)
    );
  };

  if (items.length === 0) {
    return (
      <p className="border border-t-0 border-border bg-background px-4 py-3 text-xs text-subtle-foreground">
        No subcategories — create one with this category as parent.
      </p>
    );
  }

  return (
    <div className="border border-t-0 border-border bg-background p-2 pl-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((child) => (
              <SortableItem
                key={child._id}
                category={child}
                depth={1}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface CategorySortTreeProps {
  tree: CategoryTreeNode[];
  onReorder: (parentId: string | null, orderedIds: string[]) => Promise<void>;
  onView: (category: SortableCategory) => void;
  onEdit: (category: SortableCategory) => void;
  onDelete: (category: SortableCategory) => void;
  reordering?: boolean;
}

export default function CategorySortTree({
  tree,
  onReorder,
  onView,
  onEdit,
  onDelete,
  reordering = false,
}: CategorySortTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rootIds = useMemo(() => tree.map((r) => r._id), [tree]);

  const handleRootDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || reordering) return;

    const oldIndex = tree.findIndex((c) => c._id === active.id);
    const newIndex = tree.findIndex((c) => c._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(tree, oldIndex, newIndex);
    await onReorder(
      null,
      reordered.map((c) => c._id)
    );
  };

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (tree.length === 0) {
    return (
      <div className="border border-border bg-muted px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">No categories to display.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleRootDragEnd}
    >
      <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tree.map((root) => {
            const isOpen = expanded[root._id] ?? true;
            return (
              <div key={root._id}>
                <SortableItem
                  category={root}
                  depth={0}
                  hasChildren
                  expanded={isOpen}
                  onToggleExpand={() => toggle(root._id)}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
                {isOpen && (
                  <ChildList
                    parentId={root._id}
                    items={root.children}
                    onReorder={onReorder}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    reordering={reordering}
                  />
                )}
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
