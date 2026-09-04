'use client';

import {
  AUDIENCE_LABELS,
  REWARD_TYPE_META,
  STATUS_META,
  TRIGGER_LABELS,
} from '@/components/admin/deals/constants';
import type { AdminDeal } from '@/components/admin/deals/types';
import { useCurrency } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
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
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

const DATE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

interface DealsListProps {
  deals: AdminDeal[];
  onReorder: (ordered: AdminDeal[]) => void;
  onToggle: (deal: AdminDeal, isActive: boolean) => void;
  onEdit: (deal: AdminDeal) => void;
  onDelete: (deal: AdminDeal) => void;
  togglingId: string | null;
}

export default function DealsList({
  deals,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
  togglingId,
}: DealsListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = deals.findIndex((deal) => deal.id === active.id);
    const to = deals.findIndex((deal) => deal.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(deals, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {deals.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              toggling={togglingId === deal.id}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function DealRow({
  deal,
  toggling,
  onToggle,
  onEdit,
  onDelete,
}: {
  deal: AdminDeal;
  toggling: boolean;
  onToggle: (deal: AdminDeal, isActive: boolean) => void;
  onEdit: (deal: AdminDeal) => void;
  onDelete: (deal: AdminDeal) => void;
}) {
  const { formatPrice } = useCurrency();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });
  const meta = REWARD_TYPE_META[deal.rewardType];
  const Icon = meta.icon;
  const status = STATUS_META[deal.status];

  const trigger =
    deal.triggerType === 'subtotal_min'
      ? `${TRIGGER_LABELS.subtotal_min} ${formatPrice(deal.triggerValue)}`
      : `${TRIGGER_LABELS.item_count_min} ${deal.triggerValue} items`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'grid items-center gap-3 border border-border bg-card px-3 py-3',
        'grid-cols-[auto_1fr_auto] lg:grid-cols-[auto_minmax(0,2fr)_10rem_minmax(0,1fr)_8rem_5rem_auto]',
        isDragging && 'z-10 shadow-lg'
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Reorder ${deal.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{deal.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {AUDIENCE_LABELS[deal.audience]}
          {deal.isExclusive && ' · Exclusive'}
          {deal.internalNote && ` · ${deal.internalNote}`}
        </p>
      </div>

      <span
        className={cn(
          'hidden w-fit items-center gap-1.5 border px-2 py-0.5 text-xs font-medium lg:inline-flex',
          meta.badgeClass
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </span>

      <p className="hidden truncate text-xs text-muted-foreground lg:block">{trigger}</p>

      <div className="hidden lg:block">
        <span className={cn('border px-2 py-0.5 text-xs font-medium', status.className)}>
          {status.label}
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          {DATE_FORMAT.format(new Date(deal.startsAt))} – {DATE_FORMAT.format(new Date(deal.endsAt))}
        </p>
      </div>

      <p className="hidden text-sm tabular-nums text-foreground lg:block">
        {deal.redemptions}
        {deal.usageLimit ? <span className="text-muted-foreground">/{deal.usageLimit}</span> : null}
      </p>

      <div className="flex items-center gap-1">
        <Switch
          checked={deal.isActive}
          disabled={toggling}
          onCheckedChange={(checked) => onToggle(deal, checked)}
          aria-label={`${deal.isActive ? 'Pause' : 'Activate'} ${deal.name}`}
        />
        <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${deal.name}`} onClick={() => onEdit(deal)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Delete ${deal.name}`}
          onClick={() => onDelete(deal)}
          className="text-destructive-600 hover:bg-destructive-50 hover:text-destructive-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
