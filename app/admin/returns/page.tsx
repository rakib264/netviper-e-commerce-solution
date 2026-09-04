'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import {
  RETURN_STATUSES,
  TRANSITION_REQUIRED_FIELDS,
  allowedTransitionsFrom,
  missingTransitionFields,
  type ReturnStatus,
} from '@/lib/returns/policy';
import { returnReasonKey } from '@/lib/returns/reasons';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ReturnLine {
  productId: string | null;
  productName: string;
  quantity: number;
  variant: string | null;
  reason: string;
  details: string;
}

interface HistoryEntry {
  status: string;
  message: string;
  timestamp: string;
  actorRole: string | null;
}

interface ReturnRow {
  _id: string;
  requestId: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  type: 'return' | 'exchange';
  reason: string;
  details: string;
  products: ReturnLine[];
  status: ReturnStatus;
  statusHistory: HistoryEntry[];
  adminNotes: string;
  refundAmount: number | null;
  refundMethod: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  policyOverride: { at: string; reason: string; waivedCodes: string[] } | null;
  createdAt: string;
}

const REFUND_METHODS = ['original_payment', 'store_credit', 'bank_transfer'] as const;

/** Field name from the policy → the locale key naming it for an agent. */
const REQUIRED_FIELD_LABEL_KEYS: Record<string, string> = {
  message: 'admin.returns.queue.form.message',
  refundAmount: 'admin.returns.queue.form.refundAmount',
  refundMethod: 'admin.returns.queue.form.refundMethod',
};

const EMPTY_DECISION = {
  status: '',
  message: '',
  adminNotes: '',
  refundAmount: '',
  refundMethod: '',
  trackingNumber: '',
  courierName: '',
};

/**
 * The returns queue.
 *
 * An operations screen: filter to a status, find the request, read what the
 * customer asked for, decide. Everything on it exists because an agent needs it
 * to make that decision — which is why the previous version's animated stat
 * tiles, gradient cards and inline order-lookup panel are gone.
 *
 * The decision form is driven by `lib/returns/policy`: it offers only the
 * transitions the server will accept and blocks submission until that
 * transition's required fields are filled, so an agent never discovers a rule
 * by being rejected.
 */
export default function AdminReturnsPage() {
  const { t, tPlural } = useTranslation();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const [decision, setDecision] = useState({ ...EMPTY_DECISION });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status !== 'all') params.set('status', status);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const response = await fetch(`/api/admin/returns?${params.toString()}`);
      if (!response.ok) throw new Error('request failed');
      const payload = await response.json();
      setRows(payload.returnRequests || []);
      setCounts(payload.counts || {});
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCount = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + value, 0),
    [counts],
  );

  const transitions = selected ? allowedTransitionsFrom(selected.status) : [];

  const missingRequired = decision.status
    ? missingTransitionFields(decision.status as ReturnStatus, {
        message: decision.message,
        refundAmount: decision.refundAmount ? Number(decision.refundAmount) : undefined,
        refundMethod: decision.refundMethod,
      })
    : [];

  const requiredFields = decision.status
    ? TRANSITION_REQUIRED_FIELDS[decision.status as ReturnStatus] || []
    : [];

  const open = (row: ReturnRow) => {
    setSelected(row);
    // Pre-filled from the request so an agent edits rather than retypes.
    setDecision({
      ...EMPTY_DECISION,
      adminNotes: row.adminNotes || '',
      refundAmount: row.refundAmount != null ? String(row.refundAmount) : '',
      refundMethod: row.refundMethod || '',
      trackingNumber: row.trackingNumber || '',
      courierName: row.courierName || '',
    });
  };

  const save = async () => {
    if (!selected) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/returns/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision.status || undefined,
          message: decision.message || undefined,
          adminNotes: decision.adminNotes || undefined,
          refundAmount: decision.refundAmount ? Number(decision.refundAmount) : undefined,
          refundMethod: decision.refundMethod || undefined,
          trackingNumber: decision.trackingNumber || undefined,
          courierName: decision.courierName || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        // The server's own message is more specific than a generic failure —
        // an illegal transition names the pair, a missing field names the field.
        toast({
          title: payload.error || t('admin.returns.queue.form.error'),
          variant: 'error',
        });
        return;
      }

      toast({ title: t('admin.returns.queue.form.saved'), variant: 'success' });
      setSelected(null);
      await load();
    } catch {
      toast({ title: t('admin.returns.queue.form.error'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));

  const filters = ['all', ...RETURN_STATUSES] as const;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header>
          <h1 className="typography-section-title text-hierarchy-title">
            {t('admin.returns.queue.title')}
          </h1>
          <p className="mt-1 typography-caption text-hierarchy-subtitle">
            {t('admin.returns.queue.subtitle')}
          </p>
        </header>

        {/* Status chips double as the counts read-out, so there is no separate
            row of stat tiles to keep in sync. */}
        <div className="flex flex-wrap gap-2">
          {filters.map((value) => {
            const count = value === 'all' ? totalCount : counts[value] || 0;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  value === status
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'all'
                  ? t('admin.returns.queue.all')
                  : t(`returns.rules.status.${value}`)}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.returns.queue.search')}
          className="max-w-md"
        />

        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.returns.queue.columns.reference')}</TableHead>
                <TableHead>{t('admin.returns.queue.columns.order')}</TableHead>
                <TableHead>{t('admin.returns.queue.columns.customer')}</TableHead>
                <TableHead>{t('admin.returns.queue.columns.type')}</TableHead>
                <TableHead>{t('admin.returns.queue.columns.items')}</TableHead>
                <TableHead>{t('admin.returns.queue.columns.status')}</TableHead>
                <TableHead>{t('admin.returns.queue.columns.submitted')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center typography-micro text-muted-foreground"
                  >
                    {t('admin.returns.queue.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row._id}
                    onClick={() => open(row)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs">{row.requestId}</TableCell>
                    <TableCell className="font-mono text-xs">{row.orderId}</TableCell>
                    <TableCell>
                      <span className="block">{row.customerName}</span>
                      <span className="block typography-micro text-muted-foreground">
                        {row.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.type === 'exchange'
                        ? t('admin.returns.queue.typeExchange')
                        : t('admin.returns.queue.typeReturn')}
                    </TableCell>
                    <TableCell>
                      {tPlural('admin.returns.queue.itemCount', row.products.length)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`returns.rules.status.${row.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="typography-micro text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(next) => !next && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-base">
                  {t('admin.returns.queue.detail.title', {
                    reference: selected.requestId,
                  })}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-7">
                <section className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('admin.returns.queue.detail.orderInfo')}
                    </p>
                    <p className="mt-1 font-mono text-sm">{selected.orderId}</p>
                    <p className="typography-micro text-muted-foreground">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('admin.returns.queue.detail.contact')}
                    </p>
                    <p className="mt-1 text-sm">{selected.customerName}</p>
                    <p className="typography-micro text-muted-foreground">
                      {[selected.email, selected.phone].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </section>

                {selected.policyOverride ? (
                  <p className="rounded-md border border-warning-200 bg-warning-50/60 p-3 typography-micro text-warning-800">
                    {t('admin.returns.queue.detail.override')} —{' '}
                    {selected.policyOverride.reason}
                    {selected.policyOverride.waivedCodes.length > 0
                      ? ` (${t('admin.returns.queue.detail.overrideWaived', {
                          codes: selected.policyOverride.waivedCodes.join(', '),
                        })})`
                      : ''}
                  </p>
                ) : null}

                <section>
                  <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('admin.returns.queue.detail.lines')}
                  </p>
                  <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                    {selected.products.map((line, index) => (
                      <li key={index} className="px-3 py-2.5">
                        <p className="text-sm">
                          {line.quantity} × {line.productName}
                          {line.variant ? ` (${line.variant})` : ''}
                        </p>
                        <p className="typography-micro text-muted-foreground">
                          {t(returnReasonKey(line.reason))}
                          {line.details ? ` · ${line.details}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 typography-micro text-muted-foreground">
                    {t('admin.returns.queue.detail.reasonGiven')}:{' '}
                    {t(returnReasonKey(selected.reason))}
                  </p>
                  {selected.details ? (
                    <p className="mt-1 typography-micro text-muted-foreground">
                      {t('admin.returns.queue.detail.customerNotes')}: {selected.details}
                    </p>
                  ) : null}
                </section>

                <section>
                  <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('admin.returns.queue.detail.timeline')}
                  </p>
                  <ol className="mt-2 space-y-2.5">
                    {selected.statusHistory.map((entry, index) => (
                      <li key={index} className="flex gap-3">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm">
                            {t(`returns.rules.status.${entry.status}`)}
                            {entry.actorRole ? (
                              <span className="ml-2 typography-micro text-muted-foreground">
                                {entry.actorRole}
                              </span>
                            ) : null}
                          </p>
                          <p className="typography-micro text-muted-foreground">
                            {formatDate(entry.timestamp)}
                            {entry.message ? ` · ${entry.message}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="space-y-4 border-t border-border pt-5">
                  <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('admin.returns.queue.detail.decision')}
                  </p>

                  {transitions.length === 0 ? (
                    <p className="typography-micro text-muted-foreground">
                      {t('admin.returns.queue.form.closed')}
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="decision-status">
                          {t('admin.returns.queue.form.status')}
                        </Label>
                        <Select
                          value={decision.status || undefined}
                          onValueChange={(value) =>
                            setDecision((previous) => ({ ...previous, status: value }))
                          }
                        >
                          <SelectTrigger id="decision-status">
                            <SelectValue
                              placeholder={t('admin.returns.queue.form.statusPlaceholder')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {transitions.map((next) => (
                              <SelectItem key={next} value={next}>
                                {t(`returns.rules.status.${next}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Only the fields this transition actually needs. */}
                      {requiredFields.includes('message') || decision.status ? (
                        <div className="space-y-2">
                          <Label htmlFor="decision-message">
                            {t('admin.returns.queue.form.message')}
                            {requiredFields.includes('message') ? ' *' : ''}
                          </Label>
                          <Textarea
                            id="decision-message"
                            rows={2}
                            value={decision.message}
                            onChange={(event) =>
                              setDecision((previous) => ({
                                ...previous,
                                message: event.target.value,
                              }))
                            }
                            placeholder={t('admin.returns.queue.form.messagePlaceholder')}
                          />
                        </div>
                      ) : null}

                      {requiredFields.includes('refundAmount') ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="decision-refund-amount">
                              {t('admin.returns.queue.form.refundAmount')} *
                            </Label>
                            <Input
                              id="decision-refund-amount"
                              type="number"
                              min={0}
                              step="0.01"
                              value={decision.refundAmount}
                              onChange={(event) =>
                                setDecision((previous) => ({
                                  ...previous,
                                  refundAmount: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="decision-refund-method">
                              {t('admin.returns.queue.form.refundMethod')} *
                            </Label>
                            <Select
                              value={decision.refundMethod || undefined}
                              onValueChange={(value) =>
                                setDecision((previous) => ({
                                  ...previous,
                                  refundMethod: value,
                                }))
                              }
                            >
                              <SelectTrigger id="decision-refund-method">
                                <SelectValue
                                  placeholder={t(
                                    'admin.returns.queue.form.refundMethodPlaceholder',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {REFUND_METHODS.map((method) => (
                                  <SelectItem key={method} value={method}>
                                    {t(`admin.returns.queue.refundMethods.${method}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : null}

                      {decision.status === 'shipped' || decision.status === 'processing' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="decision-tracking">
                              {t('admin.returns.queue.form.trackingNumber')}
                            </Label>
                            <Input
                              id="decision-tracking"
                              value={decision.trackingNumber}
                              onChange={(event) =>
                                setDecision((previous) => ({
                                  ...previous,
                                  trackingNumber: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="decision-courier">
                              {t('admin.returns.queue.form.courierName')}
                            </Label>
                            <Input
                              id="decision-courier"
                              value={decision.courierName}
                              onChange={(event) =>
                                setDecision((previous) => ({
                                  ...previous,
                                  courierName: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label htmlFor="decision-notes">
                          {t('admin.returns.queue.form.adminNotes')}
                        </Label>
                        <Textarea
                          id="decision-notes"
                          rows={2}
                          value={decision.adminNotes}
                          onChange={(event) =>
                            setDecision((previous) => ({
                              ...previous,
                              adminNotes: event.target.value,
                            }))
                          }
                          placeholder={t('admin.returns.queue.form.adminNotesPlaceholder')}
                        />
                      </div>

                      {missingRequired.length > 0 ? (
                        <p className="typography-micro text-destructive-600">
                          {t('admin.returns.requiredForDecision', {
                            fields: missingRequired
                              .map((field) => t(REQUIRED_FIELD_LABEL_KEYS[field]))
                              .join(', '),
                          })}
                        </p>
                      ) : null}

                      <Button
                        onClick={save}
                        disabled={saving || !decision.status || missingRequired.length > 0}
                      >
                        {saving
                          ? t('admin.returns.queue.form.saving')
                          : t('admin.returns.queue.form.submit')}
                      </Button>
                    </>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
