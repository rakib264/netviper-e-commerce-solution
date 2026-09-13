'use client';

import FixRoutingDialog, {
  type FixRoutingTarget,
} from '@/components/admin/courier/FixRoutingDialog';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2, MapPin, RefreshCw, Send, Truck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

/**
 * The dispatch desk: confirmed orders that have a courier record, and what
 * has (or has not) reached Pathao/Steadfast.
 *
 * A courier with a `consignmentId` is live at the provider; one without is
 * still ours to send. `dispatchError` is the third lane — those failed and are
 * the ones an operator actually has to look at.
 */

type Lane = 'undispatched' | 'dispatched' | 'failed' | 'all';

interface CourierRow {
  _id: string;
  courierId: string;
  order: { _id: string; orderNumber: string; total: number } | null;
  parcel: { quantity: number; weight: number; description: string };
  isCOD: boolean;
  codAmount?: number;
  status: string;
  courierPartner?: string;
  consignmentId?: string;
  trackingCode?: string;
  trackingNumber?: string;
  providerStatus?: string;
  providerDeliveryFee?: number;
  dispatchedAt?: string;
  lastSyncedAt?: string;
  dispatchError?: string;
  routingErrorKey?: string;
  receiver: { name: string; phone: string; address?: string; city?: string; district?: string };
  createdAt: string;
}

const LANES: Lane[] = ['undispatched', 'failed', 'dispatched', 'all'];

const STATUS_TONE: Record<string, string> = {
  pending: 'text-muted-foreground',
  picked: 'text-info-700',
  in_transit: 'text-info-700',
  delivered: 'text-primary',
  returned: 'text-warning-700',
  cancelled: 'text-destructive',
};

export default function ConsignmentBoard() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const [lane, setLane] = useState<Lane>('undispatched');
  const [provider, setProvider] = useState<'all' | 'pathao' | 'steadfast'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [rows, setRows] = useState<CourierRow[]>([]);
  const [counts, setCounts] = useState({ dispatched: 0, undispatched: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<'dispatch' | 'sync' | null>(null);
  const [dispatchProvider, setDispatchProvider] = useState<'default' | 'pathao' | 'steadfast'>(
    'default',
  );
  const [fixing, setFixing] = useState<FixRoutingTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (lane !== 'all') params.set('dispatchState', lane);
      if (provider !== 'all') params.set('provider', provider);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await fetch(`/api/admin/courier?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      const data = await response.json();
      setRows(data.couriers ?? []);
      setCounts(data.counts ?? { dispatched: 0, undispatched: 0, failed: 0 });
      setSelected([]);
    } catch {
      toast({ title: t('admin.courier.consignments.loadError'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [lane, provider, debouncedSearch, t, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggleAll = () => setSelected(allSelected ? [] : rows.map((row) => row._id));

  const toggleOne = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );

  const dispatch = async (courierIds: string[]) => {
    if (!courierIds.length) return;
    const single = courierIds.length === 1;
    if (single) setBusy(courierIds[0]);
    else setBulkBusy('dispatch');

    try {
      const response = await fetch('/api/admin/courier/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierIds,
          ...(dispatchProvider === 'default' ? {} : { provider: dispatchProvider }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'dispatch failed');

      const { dispatched = 0, failed = 0 } = data.summary ?? {};
      const firstError = data.results?.find((result: any) => !result.ok)?.error;

      toast({
        title: t('admin.courier.consignments.dispatchDone', {
          dispatched: String(dispatched),
          failed: String(failed),
        }),
        description: firstError || undefined,
        variant: failed > 0 ? 'warning' : 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: t('admin.courier.consignments.dispatchError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setBusy(null);
      setBulkBusy(null);
    }
  };

  const sync = async (courierIds: string[]) => {
    if (!courierIds.length) return;
    const single = courierIds.length === 1;
    if (single) setBusy(courierIds[0]);
    else setBulkBusy('sync');

    try {
      const response = await fetch('/api/admin/courier/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'sync failed');

      const { updated = 0, failed = 0 } = data.summary ?? {};
      toast({
        title: t('admin.courier.consignments.syncDone', {
          updated: String(updated),
          failed: String(failed),
        }),
        variant: failed > 0 ? 'warning' : 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: t('admin.courier.consignments.syncError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setBusy(null);
      setBulkBusy(null);
    }
  };

  // `total` is the count for the *active* lane, so "All" is summed from the
  // lane-independent counts instead — otherwise the All tab would echo
  // whichever lane happens to be open.
  const laneCount = (value: Lane) =>
    value === 'all'
      ? counts.dispatched + counts.undispatched
      : (counts[value as keyof typeof counts] ?? 0);

  const formatDate = (iso?: string) =>
    iso
      ? new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(iso))
      : '—';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {LANES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLane(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              value === lane
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`admin.courier.consignments.lanes.${value}`)}
            <span className="ml-1.5 opacity-70">{laneCount(value)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.courier.consignments.search')}
          className="max-w-sm"
        />
        <Select
          value={provider}
          onValueChange={(value) => setProvider(value as typeof provider)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('admin.courier.consignments.allProviders')}
            </SelectItem>
            <SelectItem value="steadfast">Steadfast</SelectItem>
            <SelectItem value="pathao">Pathao</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('admin.courier.consignments.refresh')}
        </Button>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <span className="typography-micro text-muted-foreground">
            {t('admin.courier.consignments.selected', { count: String(selected.length) })}
          </span>
          <Select
            value={dispatchProvider}
            onValueChange={(value) => setDispatchProvider(value as typeof dispatchProvider)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t('admin.courier.consignments.useDefaultProvider')}
              </SelectItem>
              <SelectItem value="steadfast">Steadfast</SelectItem>
              <SelectItem value="pathao">Pathao</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={() => dispatch(selected)}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === 'dispatch' ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-2 h-3.5 w-3.5" />
            )}
            {t('admin.courier.consignments.dispatchSelected')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => sync(selected)}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === 'sync' ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            {t('admin.courier.consignments.syncSelected')}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label={t('admin.courier.consignments.selectAll')}
                />
              </TableHead>
              <TableHead>{t('admin.courier.consignments.columns.order')}</TableHead>
              <TableHead>{t('admin.courier.consignments.columns.recipient')}</TableHead>
              <TableHead>{t('admin.courier.consignments.columns.cod')}</TableHead>
              <TableHead>{t('admin.courier.consignments.columns.provider')}</TableHead>
              <TableHead>{t('admin.courier.consignments.columns.consignment')}</TableHead>
              <TableHead>{t('admin.courier.consignments.columns.status')}</TableHead>
              <TableHead>{t('admin.courier.consignments.columns.updated')}</TableHead>
              <TableHead className="text-right">
                {t('admin.courier.consignments.columns.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={9}>
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-10 text-center typography-micro text-muted-foreground"
                >
                  {t('admin.courier.consignments.empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(row._id)}
                      onCheckedChange={() => toggleOne(row._id)}
                      aria-label={t('admin.courier.consignments.selectRow', {
                        courier: row.courierId,
                      })}
                    />
                  </TableCell>
                  <TableCell>
                    {row.order ? (
                      <Link
                        href={`/admin/orders?orderId=${row.order._id}`}
                        className="font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {row.order.orderNumber}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.courierId}
                      </span>
                    )}
                    <span className="block typography-micro text-muted-foreground">
                      {row.courierId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block">{row.receiver?.name}</span>
                    <span className="block typography-micro text-muted-foreground">
                      {row.receiver?.phone}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.isCOD ? formatPrice(row.codAmount ?? 0) : '—'}
                  </TableCell>
                  <TableCell>
                    {row.courierPartner ? (
                      <Badge variant="outline" className="capitalize">
                        {row.courierPartner}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {row.consignmentId ? (
                      <>
                        <span className="block font-mono text-xs">{row.consignmentId}</span>
                        {row.trackingCode ? (
                          <span className="block typography-micro text-muted-foreground">
                            {row.trackingCode}
                          </span>
                        ) : null}
                      </>
                    ) : row.dispatchError ? (
                      <span className="flex items-start gap-1 typography-micro text-destructive">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {/* The key is stored for exactly this: the reason was
                            written server-side and is read here in whichever
                            language the admin is using. */}
                        {row.routingErrorKey ? t(row.routingErrorKey) : row.dispatchError}
                      </span>
                    ) : (
                      <span className="typography-micro text-muted-foreground">
                        {t('admin.courier.consignments.notDispatched')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn('typography-micro', STATUS_TONE[row.status])}>
                      {t(`admin.courier.consignments.status.${row.status}`)}
                    </span>
                    {row.providerStatus ? (
                      <span className="block typography-micro text-muted-foreground">
                        {row.providerStatus}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="typography-micro text-muted-foreground">
                    {formatDate(row.lastSyncedAt ?? row.dispatchedAt ?? row.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.consignmentId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => sync([row._id])}
                        disabled={busy === row._id}
                      >
                        {busy === row._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-2 hidden sm:inline">
                          {t('admin.courier.consignments.sync')}
                        </span>
                      </Button>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {row.dispatchError && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setFixing(row)}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="ml-2 hidden sm:inline">
                              {t('admin.courier.routing.fix')}
                            </span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => dispatch([row._id])}
                          disabled={busy === row._id}
                        >
                          {busy === row._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Truck className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-2 hidden sm:inline">
                            {t('admin.courier.consignments.dispatch')}
                          </span>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FixRoutingDialog target={fixing} onClose={() => setFixing(null)} onFixed={load} />
    </div>
  );
}
