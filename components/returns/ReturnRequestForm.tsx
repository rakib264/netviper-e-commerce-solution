'use client';

import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
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
import { Textarea } from '@/components/ui/textarea';
import { ineligibilityKey, nonReturnableReasonKey } from '@/lib/returns/policy';
import { RETURN_REASONS, returnReasonKey } from '@/lib/returns/reasons';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

/** One line as `/api/returns/lookup` describes it. */
interface OrderLine {
  productId: string | null;
  name: string;
  variant?: string;
  price: number;
  purchasedQuantity: number;
  requestedQuantity: number;
  availableQuantity: number;
  eligible: boolean;
  reasonCode?: string;
  nonReturnableReason?: string;
  returnWindowDays: number;
  returnWindowEndsAt: string | null;
}

interface LookedUpOrder {
  orderNumber: string;
  orderStatus: string;
  deliveredAt: string | null;
  hasReturnableLines: boolean;
  lines: OrderLine[];
}

/** A selected line, keyed by its position so unmatched names cannot collide. */
interface Selection {
  quantity: number;
  reason: string;
}

interface IneligibleNotice {
  productName: string;
  code: string;
  messageKey: string;
  reasonKey: string | null;
}

/**
 * Open a return request.
 *
 * The order comes first, and everything after it is chosen from what the order
 * actually contains. That is the whole point: the previous form asked the
 * customer to *type* a product name, and the server then tried to match that
 * string against the order's line names — so "Leather Tote" against a line
 * called "Leather Tote Bag" failed, and a customer with a perfectly returnable
 * delivered item was told it was "not eligible for return".
 *
 * Selecting from fetched lines means every submitted line carries its
 * `productId`, and eligibility is decided against the real order line rather
 * than a string comparison.
 */
export function ReturnRequestForm({
  onSubmitted,
}: {
  onSubmitted: (requestId: string) => void;
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<LookedUpOrder | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [selections, setSelections] = useState<Record<number, Selection>>({});
  const [type, setType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState(session?.user?.name || '');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ineligible, setIneligible] = useState<IneligibleNotice[]>([]);

  const eligibleLines = useMemo(
    () => (order?.lines || []).map((line, index) => ({ line, index })).filter((entry) => entry.line.eligible),
    [order],
  );

  const selectedCount = Object.values(selections).filter((s) => s.quantity > 0).length;

  const handleLookup = async () => {
    setError('');
    setIneligible([]);

    if (!orderNumber.trim()) {
      setError(t('returns.flow.errors.orderNumberRequired'));
      return;
    }
    // Signed-in customers are scoped by session, so their email is never asked
    // for; a guest has to prove possession of the order with it.
    if (!isSignedIn && !email.trim()) {
      setError(t('returns.flow.errors.emailRequired'));
      return;
    }

    setLookingUp(true);
    try {
      const response = await fetch('/api/returns/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(t('returns.flow.lookup.notFound'));
        return;
      }

      setOrder(payload.order);
      setSelections({});
    } catch {
      setError(t('returns.flow.errors.generic'));
    } finally {
      setLookingUp(false);
    }
  };

  const setLine = (index: number, patch: Partial<Selection>) => {
    setSelections((previous) => {
      const current = previous[index] || { quantity: 0, reason: '' };
      const next = { ...current, ...patch };
      if (next.quantity <= 0) {
        const { [index]: _dropped, ...rest } = previous;
        return rest;
      }
      return { ...previous, [index]: next };
    });
  };

  const handleSubmit = async () => {
    setError('');
    setIneligible([]);

    if (selectedCount === 0) {
      setError(t('returns.flow.select.nothingSelected'));
      return;
    }
    if (!name.trim()) {
      setError(t('returns.flow.errors.nameRequired'));
      return;
    }
    if (!reason) {
      setError(t('returns.flow.errors.reasonRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order?.orderNumber,
          customerName: name.trim(),
          // The account email is authoritative for a signed-in customer, so the
          // field is not shown and not required.
          email: (isSignedIn ? session?.user?.email : email) || email,
          phone: phone.trim(),
          type,
          reason,
          details: notes.trim(),
          products: Object.entries(selections).map(([index, selection]) => {
            const line = order!.lines[Number(index)];
            return {
              // The durable identifier. Its absence is what broke matching.
              productId: line.productId,
              productName: line.name,
              variant: line.variant,
              quantity: selection.quantity,
              reason: selection.reason || reason,
            };
          }),
        }),
      });

      const payload = await response.json();

      if (response.status === 422 && Array.isArray(payload.ineligible)) {
        setIneligible(payload.ineligible);
        return;
      }
      if (!response.ok) {
        setError(payload.error || t('returns.flow.errors.generic'));
        return;
      }

      onSubmitted(payload.requestId);
    } catch {
      setError(t('returns.flow.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatWindowDate = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(iso))
      : '';

  /* ── Step 1: the order ─────────────────────────────────────────────────── */

  if (!order) {
    return (
      <div className="max-w-xl space-y-5">
        <div>
          <h2 className="typography-card-title text-hierarchy-title">
            {t('returns.flow.lookup.heading')}
          </h2>
          <p className="mt-1 typography-micro text-muted-foreground">
            {t('returns.flow.lookup.help')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-order-number">
            {t('returns.flow.lookup.orderNumber')}
          </Label>
          <Input
            id="return-order-number"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder={t('returns.flow.lookup.orderNumberPlaceholder')}
            autoComplete="off"
          />
        </div>

        {!isSignedIn && (
          <div className="space-y-2">
            <Label htmlFor="return-email">{t('returns.flow.lookup.email')}</Label>
            <Input
              id="return-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('returns.flow.lookup.emailPlaceholder')}
              autoComplete="email"
            />
          </div>
        )}

        {error ? (
          <p className="typography-micro text-destructive-600">{error}</p>
        ) : null}

        <Button onClick={handleLookup} disabled={lookingUp}>
          {lookingUp
            ? t('returns.flow.lookup.searching')
            : t('returns.flow.lookup.submit')}
        </Button>
      </div>
    );
  }

  /* ── Step 2: the items and the details ─────────────────────────────────── */

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="typography-card-title text-hierarchy-title">
            {t('returns.flow.select.heading')}
          </h2>
          <p className="mt-1 typography-micro text-muted-foreground">
            {order.orderNumber} · {t('returns.flow.select.help')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOrder(null);
            setSelections({});
            setError('');
            setIneligible([]);
          }}
        >
          {t('returns.flow.lookup.changeOrder')}
        </Button>
      </div>

      {!order.hasReturnableLines ? (
        <p className="rounded-lg border border-border bg-muted/40 p-4 typography-body text-muted-foreground">
          {t('returns.flow.select.noneEligible')}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {order.lines.map((line, index) => {
            const selection = selections[index];
            const isSelected = Boolean(selection?.quantity);

            return (
              <li
                key={`${line.productId || line.name}-${index}`}
                className={cn('p-4', !line.eligible && 'opacity-60')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="typography-label text-hierarchy-title">{line.name}</p>
                    <p className="mt-0.5 typography-micro text-muted-foreground">
                      {[
                        line.variant,
                        formatPrice(line.price),
                        line.requestedQuantity > 0
                          ? t('returns.flow.select.alreadyRequested', {
                              count: line.requestedQuantity,
                            })
                          : null,
                        line.eligible && line.returnWindowEndsAt
                          ? t('returns.flow.select.windowEnds', {
                              date: formatWindowDate(line.returnWindowEndsAt),
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>

                    {/* Why a line is refused, in the customer's language. */}
                    {!line.eligible && line.reasonCode ? (
                      <p className="mt-1.5 typography-micro text-destructive-600">
                        {line.reasonCode === 'non_returnable'
                          ? t(nonReturnableReasonKey(line.nonReturnableReason))
                          : t(ineligibilityKey(line.reasonCode as never))}
                      </p>
                    ) : null}
                  </div>

                  {line.eligible ? (
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`qty-${index}`}
                        className="typography-micro text-muted-foreground"
                      >
                        {t('returns.flow.select.quantity')}
                      </Label>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        min={0}
                        max={line.availableQuantity}
                        value={selection?.quantity ?? 0}
                        onChange={(event) =>
                          setLine(index, {
                            quantity: Math.max(
                              0,
                              Math.min(
                                line.availableQuantity,
                                Number(event.target.value) || 0,
                              ),
                            ),
                          })
                        }
                        className="w-20"
                      />
                      <span className="typography-micro text-muted-foreground">
                        {t('returns.flow.select.of', {
                          count: line.availableQuantity,
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className="typography-micro text-muted-foreground">
                      {t('returns.flow.select.notEligible')}
                    </span>
                  )}
                </div>

                {isSelected ? (
                  <div className="mt-3 max-w-sm space-y-1.5">
                    <Label htmlFor={`reason-${index}`}>
                      {t('returns.flow.select.lineReason')}
                    </Label>
                    <Select
                      value={selection?.reason || undefined}
                      onValueChange={(value) => setLine(index, { reason: value })}
                    >
                      <SelectTrigger id={`reason-${index}`}>
                        <SelectValue
                          placeholder={t('returns.flow.select.lineReasonPlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(returnReasonKey(value))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {order.hasReturnableLines && (
        <>
          <div className="space-y-5">
            <h2 className="typography-card-title text-hierarchy-title">
              {t('returns.flow.details.heading')}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="return-type">{t('returns.flow.details.type')}</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as 'return' | 'exchange')}
                >
                  <SelectTrigger id="return-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="return">
                      {t('returns.flow.details.typeReturn')}
                    </SelectItem>
                    <SelectItem value="exchange">
                      {t('returns.flow.details.typeExchange')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-reason">
                  {t('returns.flow.details.reason')}
                </Label>
                <Select value={reason || undefined} onValueChange={setReason}>
                  <SelectTrigger id="return-reason">
                    <SelectValue
                      placeholder={t('returns.flow.details.reasonPlaceholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(returnReasonKey(value))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-name">{t('returns.flow.details.name')}</Label>
                <Input
                  id="return-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-phone">
                  {t('returns.flow.details.phone')}
                  <span className="ml-1 typography-micro text-muted-foreground">
                    {t('returns.flow.details.phoneOptional')}
                  </span>
                </Label>
                <Input
                  id="return-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-notes">{t('returns.flow.details.notes')}</Label>
              <Textarea
                id="return-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('returns.flow.details.notesPlaceholder')}
              />
            </div>
          </div>

          {ineligible.length > 0 ? (
            <div className="rounded-lg border border-destructive-200 bg-destructive-50/60 p-4">
              <p className="typography-label text-destructive-800">
                {t('returns.flow.errors.ineligibleHeading')}
              </p>
              <ul className="mt-2 space-y-1">
                {ineligible.map((notice, index) => (
                  <li
                    key={`${notice.productName}-${index}`}
                    className="typography-micro text-destructive-700"
                  >
                    {notice.productName} — {t(notice.reasonKey || notice.messageKey)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="typography-micro text-destructive-600">{error}</p>
          ) : null}

          <Button onClick={handleSubmit} disabled={submitting || selectedCount === 0}>
            {submitting
              ? t('returns.flow.details.submitting')
              : t('returns.flow.details.submit')}
          </Button>
        </>
      )}
    </div>
  );
}

export default ReturnRequestForm;
