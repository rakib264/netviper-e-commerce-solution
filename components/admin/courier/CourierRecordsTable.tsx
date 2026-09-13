'use client';

import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Eye, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/**
 * The courier record itself: the row behind a consignment.
 *
 * The consignment board owns *dispatching*. This owns the record — correcting a
 * recipient, forcing a status for a partner we have no API for, removing one
 * created by mistake. It replaces a 2034-line page whose six "analytics" cards
 * were computed from whichever twenty rows happened to be loaded, and whose
 * copy was never internationalised.
 */

const STATUSES = [
  'pending',
  'picked',
  'in_transit',
  'delivered',
  'returned',
  'cancelled',
] as const;

type CourierStatus = (typeof STATUSES)[number];

interface CourierRecord {
  _id: string;
  courierId: string;
  order: { _id: string; orderNumber: string; total: number } | null;
  sender: { name: string; phone: string; address: string };
  receiver: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    district?: string;
    division?: string;
  };
  parcel: { type: string; quantity: number; weight: number; value: number; description: string };
  isCOD: boolean;
  codAmount?: number;
  charges: { deliveryCharge: number; codCharge: number; totalCharge: number };
  status: CourierStatus;
  courierPartner?: string;
  consignmentId?: string;
  trackingNumber?: string;
  providerDeliveryFee?: number;
  dispatchError?: string;
  statusHistory: Array<{ status: string; timestamp: string; notes?: string }>;
  createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'text-muted-foreground',
  picked: 'text-info-700',
  in_transit: 'text-info-700',
  delivered: 'text-primary',
  returned: 'text-warning-700',
  cancelled: 'text-destructive',
};

const PAGE_SIZE = 25;

export default function CourierRecordsTable() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const [rows, setRows] = useState<CourierRecord[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState<'all' | CourierStatus>('all');

  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<CourierRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);

      const response = await fetch(`/api/admin/courier?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setRows(data.couriers ?? []);
      setPages(data.pagination?.pages ?? 1);
      setTotal(data.pagination?.total ?? 0);
      setSelected([]);
    } catch {
      toast({ title: t('admin.courier.records.loadError'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, t, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // A new filter invalidates the page number — page 4 of the old result set is
  // rarely page 4 of the new one, and is often past its end.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const updateStatus = async (id: string, next: CourierStatus) => {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/courier/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({ title: t('admin.courier.records.statusUpdated'), variant: 'success' });
      await load();
    } catch (error) {
      toast({
        title: t('admin.courier.records.statusError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const bulkStatus = async (next: CourierStatus) => {
    setBusy('bulk');
    try {
      const response = await fetch('/api/admin/courier/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierIds: selected, status: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({
        title: t('admin.courier.records.bulkStatusDone', { count: String(selected.length) }),
        variant: 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: t('admin.courier.records.statusError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.length) return;
    const ids = pendingDelete;
    setPendingDelete(null);
    setBusy('bulk');
    try {
      const response = await fetch('/api/admin/courier/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({
        title: t('admin.courier.records.deleteDone', { count: String(ids.length) }),
        variant: 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: t('admin.courier.records.deleteError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.courier.records.search')}
          className="h-9 w-full max-w-xs"
        />
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.courier.records.allStatuses')}</SelectItem>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`admin.courier.records.status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('admin.courier.records.refresh')}
        </Button>
        <span className="ml-auto typography-caption text-muted-foreground">
          {t('admin.courier.records.total', { count: String(total) })}
        </span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
          <span className="typography-caption text-muted-foreground">
            {t('admin.courier.records.selected', { count: String(selected.length) })}
          </span>
          <Select onValueChange={(value) => bulkStatus(value as CourierStatus)}>
            <SelectTrigger className="h-8 w-52">
              <SelectValue placeholder={t('admin.courier.records.setStatus')} />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`admin.courier.records.status.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy === 'bulk'}
            onClick={() => setPendingDelete(selected)}
          >
            {busy === 'bulk' ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-3.5 w-3.5" />
            )}
            {t('admin.courier.records.deleteSelected')}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? rows.map((row) => row._id) : [])
                  }
                  aria-label={t('admin.courier.records.selectAll')}
                />
              </TableHead>
              <TableHead>{t('admin.courier.records.columns.record')}</TableHead>
              <TableHead>{t('admin.courier.records.columns.recipient')}</TableHead>
              <TableHead>{t('admin.courier.records.columns.charges')}</TableHead>
              <TableHead>{t('admin.courier.records.columns.partner')}</TableHead>
              <TableHead>{t('admin.courier.records.columns.status')}</TableHead>
              <TableHead className="text-right">
                {t('admin.courier.records.columns.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center typography-caption text-muted-foreground">
                  {t('admin.courier.records.empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(row._id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...current, row._id]
                            : current.filter((id) => id !== row._id),
                        )
                      }
                      aria-label={t('admin.courier.records.selectRow', { id: row.courierId })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.courierId}</div>
                    <div className="typography-micro text-muted-foreground">
                      {row.order?.orderNumber ?? t('admin.courier.records.noOrder')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{row.receiver?.name}</div>
                    <div className="typography-micro text-muted-foreground">
                      {row.receiver?.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{formatPrice(row.charges?.totalCharge ?? 0)}</div>
                    {row.isCOD && (
                      <div className="typography-micro text-muted-foreground">
                        {t('admin.courier.records.codOf', {
                          amount: formatPrice(row.codAmount ?? 0),
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.courierPartner ? (
                      <Badge variant="outline">{row.courierPartner}</Badge>
                    ) : (
                      <span className="typography-micro text-muted-foreground">
                        {t('admin.courier.records.noPartner')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.status}
                      onValueChange={(value) => updateStatus(row._id, value as CourierStatus)}
                      disabled={busy === row._id}
                    >
                      <SelectTrigger
                        className={cn('h-8 w-36 border-0 px-2', STATUS_TONE[row.status])}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(`admin.courier.records.status.${value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewing(row)}
                      aria-label={t('admin.courier.records.view')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete([row._id])}
                      aria-label={t('admin.courier.records.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t('admin.courier.records.previous')}
          </Button>
          <span className="typography-caption text-muted-foreground">
            {t('common.pageOf', { page: String(page), pages: String(pages) })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
          >
            {t('admin.courier.records.next')}
          </Button>
        </div>
      )}

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.courierId}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 typography-caption">
              <Detail label={t('admin.courier.records.detail.order')}>
                {viewing.order?.orderNumber ?? t('admin.courier.records.noOrder')}
              </Detail>
              <Detail label={t('admin.courier.records.detail.recipient')}>
                {viewing.receiver?.name} · {viewing.receiver?.phone}
                <div className="text-muted-foreground">
                  {[viewing.receiver?.address, viewing.receiver?.city, viewing.receiver?.district]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </Detail>
              <Detail label={t('admin.courier.records.detail.parcel')}>
                {t('admin.courier.records.detail.parcelSummary', {
                  quantity: String(viewing.parcel?.quantity ?? 0),
                  weight: String(viewing.parcel?.weight ?? 0),
                })}
                <div className="text-muted-foreground">{viewing.parcel?.description}</div>
              </Detail>
              <Detail label={t('admin.courier.records.detail.charged')}>
                {formatPrice(viewing.charges?.totalCharge ?? 0)}
              </Detail>
              {typeof viewing.providerDeliveryFee === 'number' && (
                // The carrier's own invoice line, kept beside what the customer
                // paid: the gap between them is the delivery margin.
                <Detail label={t('admin.courier.records.detail.carrierFee')}>
                  {formatPrice(viewing.providerDeliveryFee)}
                </Detail>
              )}
              {viewing.consignmentId && (
                <Detail label={t('admin.courier.records.detail.consignment')}>
                  {viewing.consignmentId}
                </Detail>
              )}
              {viewing.dispatchError && (
                <Detail label={t('admin.courier.records.detail.lastError')}>
                  <span className="text-destructive">{viewing.dispatchError}</span>
                </Detail>
              )}
              <Detail label={t('admin.courier.records.detail.history')}>
                <ol className="space-y-1">
                  {(viewing.statusHistory ?? []).map((entry, index) => (
                    <li key={index} className="text-muted-foreground">
                      {t(`admin.courier.records.status.${entry.status}`)} —{' '}
                      {new Date(entry.timestamp).toLocaleString()}
                      {entry.notes ? ` · ${entry.notes}` : ''}
                    </li>
                  ))}
                </ol>
              </Detail>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.courier.records.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.courier.records.deleteBody', {
                count: String(pendingDelete?.length ?? 0),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t('admin.courier.records.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="typography-micro uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
