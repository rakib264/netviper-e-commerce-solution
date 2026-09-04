'use client';

import DealEditorDialog from '@/components/admin/deals/DealEditorDialog';
import DealsList from '@/components/admin/deals/DealsList';
import DealsListSkeleton from '@/components/admin/deals/DealsListSkeleton';
import {
  DEAL_TEMPLATES,
  REWARD_TYPE_META,
  REWARD_TYPE_ORDER,
  STATUS_META,
} from '@/components/admin/deals/constants';
import { emptyDealForm } from '@/components/admin/deals/dealSchema';
import type { AdminDeal, DealFormValues } from '@/components/admin/deals/types';
import { AdminRefreshIndicator } from '@/components/admin/ui/loading';
import { useTranslation } from '@/components/providers/LocalizationProvider';
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
import { useAdminResource } from '@/hooks/use-admin-resource';
import { useToastWithTypes } from '@/hooks/use-toast';
import { DEAL_STATUSES } from '@/lib/deals/status';
import type { RewardType } from '@/lib/deals/types';
import { cn } from '@/lib/utils';
import { Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export default function DealsPanel() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rewardFilter, setRewardFilter] = useState('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDeal | null>(null);
  const [seedRewardType, setSeedRewardType] = useState<RewardType>('FIXED_DISCOUNT');
  const [seedValues, setSeedValues] = useState<Partial<DealFormValues> | undefined>();

  const [deleting, setDeleting] = useState<AdminDeal | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { success, error } = useToastWithTypes();
  // `useToastWithTypes` hands back fresh function identities on every render, so
  // it is held in a ref rather than passed as a dependency — otherwise anything
  // that lists it re-runs every render and the fetch never settles.
  const notify = useRef({ success, error });
  notify.current = { success, error };

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (rewardFilter !== 'all') params.set('rewardType', rewardFilter);
    const query = params.toString();
    return query ? `/api/admin/deals?${query}` : '/api/admin/deals';
  }, [search, statusFilter, rewardFilter]);

  const {
    data: deals,
    setData: setDeals,
    loading,
    refreshing,
    refresh,
  } = useAdminResource<AdminDeal[]>({
    url,
    initialData: [],
    // Typing is debounced; a filter dropdown fires immediately.
    debounceMs: search ? 300 : 0,
    select: (payload) => payload.deals || [],
    onError: () => notify.current.error(t('admin.marketing.deals.loadFailed')),
  });

  const startFromTemplate = (rewardType: RewardType) => {
    const template = DEAL_TEMPLATES[rewardType];
    setEditing(null);
    setSeedRewardType(rewardType);
    setSeedValues(
      emptyDealForm(rewardType, {
        name: template.name,
        triggerType: template.triggerType,
        triggerValue: template.triggerValue,
        rewardConfig: { ...template.rewardConfig },
      })
    );
    setEditorOpen(true);
  };

  const startBlank = () => {
    setEditing(null);
    setSeedRewardType('FIXED_DISCOUNT');
    setSeedValues(undefined);
    setEditorOpen(true);
  };

  const handleReorder = async (ordered: AdminDeal[]) => {
    const previous = deals;
    setDeals(ordered);
    try {
      const res = await fetch('/api/admin/deals/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ordered.map((deal) => deal.id) }),
      });
      if (!res.ok) throw new Error();
      success(t('admin.marketing.deals.priorityUpdated'));
    } catch {
      // Put the list back rather than leaving the screen disagreeing with the
      // order the engine will actually use.
      setDeals(previous);
      error(t('admin.marketing.deals.reorderFailed'));
    }
  };

  const handleToggle = async (deal: AdminDeal, isActive: boolean) => {
    setTogglingId(deal.id);
    const previous = deals;
    // Optimistic: the row's own switch is the feedback. Refetching the whole
    // list here is what used to blank the panel on every toggle.
    setDeals((current) =>
      current.map((item) => (item.id === deal.id ? { ...item, isActive } : item))
    );
    try {
      const res = await fetch(`/api/admin/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error();
      success(
        t(
          isActive
            ? 'admin.marketing.deals.dealActivated'
            : 'admin.marketing.deals.dealPaused'
        )
      );
      // The server recomputes `status` from the new flag, so reconcile quietly.
      refresh();
    } catch {
      setDeals(previous);
      error(t('admin.marketing.deals.updateFailed'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/deals/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || t('admin.marketing.deals.deleteFailed'));
        return;
      }
      success(t('admin.marketing.deals.deleted'));
      refresh();
    } catch {
      error(t('admin.marketing.deals.deleteFailed'));
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  };

  const hasFilters = Boolean(search) || statusFilter !== 'all' || rewardFilter !== 'all';
  const liveCount = deals.filter((deal) => deal.isActive).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRewardFilter('all');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-navigation text-base font-semibold text-foreground">
            {t('admin.marketing.deals.title')}
          </h2>
          <p className="mt-0.5 max-w-2xl font-paragraph text-sm text-muted-foreground">
            {t('admin.marketing.deals.subtitle')}
          </p>
        </div>
        <Button onClick={startBlank} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.marketing.deals.newDeal')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/30 p-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.marketing.deals.searchPlaceholder')}
            className="bg-card pl-9 pr-9"
            aria-label={t('admin.marketing.deals.searchLabel')}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('admin.marketing.deals.clearFilters')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[10rem] bg-card"
            aria-label={t('admin.marketing.deals.statusLabel')}
          >
            <SelectValue placeholder={t('admin.marketing.deals.statusPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.marketing.deals.allStatuses')}</SelectItem>
            {DEAL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rewardFilter} onValueChange={setRewardFilter}>
          <SelectTrigger
            className="w-[11rem] bg-card"
            aria-label={t('admin.marketing.deals.rewardLabel')}
          >
            <SelectValue placeholder={t('admin.marketing.deals.rewardPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('admin.marketing.deals.allRewardTypes')}
            </SelectItem>
            {REWARD_TYPE_ORDER.map((rewardType) => (
              <SelectItem key={rewardType} value={rewardType}>
                {REWARD_TYPE_META[rewardType].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('admin.marketing.deals.clearFilters')}
          </Button>
        ) : null}
      </div>

      {!loading ? (
        <div className="flex min-h-[1.25rem] items-center justify-between gap-3">
          <p className="font-caption text-xs text-muted-foreground">
            {t('admin.marketing.deals.countLive', {
              live: liveCount,
              total: deals.length,
            })}
          </p>
          {refreshing ? (
            <AdminRefreshIndicator label={t('admin.marketing.common.updating')} />
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <DealsListSkeleton label={t('admin.marketing.deals.loading')} />
      ) : deals.length === 0 && !hasFilters ? (
        <EmptyState onPick={startFromTemplate} />
      ) : deals.length === 0 ? (
        <div className="border border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-navigation text-sm font-medium text-foreground">
            {t('admin.marketing.deals.noMatchTitle')}
          </p>
          <p className="mt-1 font-paragraph text-sm text-muted-foreground">
            {t('admin.marketing.deals.noMatchBody')}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
            {t('admin.marketing.deals.clearFilters')}
          </Button>
        </div>
      ) : (
        // Dimmed, not replaced: the rows stay in place while a refresh lands.
        <div
          className={cn(
            'transition-opacity duration-200',
            refreshing && 'pointer-events-none opacity-60',
          )}
          aria-busy={refreshing}
        >
          <DealsList
            deals={deals}
            togglingId={togglingId}
            onReorder={handleReorder}
            onToggle={handleToggle}
            onEdit={(deal) => {
              setEditing(deal);
              setSeedValues(undefined);
              setEditorOpen(true);
            }}
            onDelete={(deal) => {
              setDeleting(deal);
              setDeleteOpen(true);
            }}
          />
        </div>
      )}

      <DealEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        deal={editing}
        seedRewardType={seedRewardType}
        seedValues={seedValues}
        onSaved={refresh}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('admin.marketing.deals.deleteTitle')}
        description={t('admin.marketing.deals.deleteBody')}
        entityName={deleting?.name || t('admin.marketing.deals.dealFallbackName')}
      />
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (rewardType: RewardType) => void }) {
  const { t } = useTranslation();

  return (
    <div className="border border-border bg-card px-6 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="font-navigation text-base font-semibold text-foreground">
          {t('admin.marketing.deals.emptyTitle')}
        </h3>
        <p className="mt-1 font-paragraph text-sm text-muted-foreground">
          {t('admin.marketing.deals.emptyBody')}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REWARD_TYPE_ORDER.map((rewardType) => {
          const meta = REWARD_TYPE_META[rewardType];
          const Icon = meta.icon;
          return (
            <button
              key={rewardType}
              type="button"
              onClick={() => onPick(rewardType)}
              className="flex flex-col gap-2 border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-navigation text-sm font-medium text-foreground">
                {meta.label}
              </span>
              <span className="font-caption text-xs text-muted-foreground">
                {meta.blurb}
              </span>
              <span className="mt-auto pt-2 font-label text-xs font-medium text-primary-700">
                {meta.settlesLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
