'use client';

import { useCurrency, useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { returnReasonKey } from '@/lib/returns/reasons';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

interface TrackedRequest {
  requestId: string;
  orderId: string;
  type: 'return' | 'exchange';
  status: string;
  createdAt: string;
  products: Array<{
    productName: string;
    quantity: number;
    variant: string | null;
    reason: string;
  }>;
  statusHistory: Array<{
    status: string;
    message: string;
    timestamp: string;
  }>;
  refundAmount: number | null;
  trackingNumber: string | null;
  courierName: string | null;
}

/**
 * Look up one return request.
 *
 * A reference alone is not a credential, so a guest also supplies the email the
 * request was filed under — the endpoint requires it. A signed-in customer is
 * scoped by session and is never asked.
 *
 * Accepts an `initialReference` so the confirmation screen and the notification
 * deep link (`/returns?request=REQ-…`) can land straight on a tracked request.
 */
export default function ReturnTracker({
  initialReference,
}: {
  initialReference?: string;
} = {}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  const [reference, setReference] = useState(initialReference || '');
  const [email, setEmail] = useState('');
  const [request, setRequest] = useState<TrackedRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const track = useCallback(
    async (lookupReference: string, lookupEmail: string) => {
      if (!lookupReference.trim()) return;

      setLoading(true);
      setError('');
      setRequest(null);

      try {
        const params = new URLSearchParams({ requestId: lookupReference.trim() });
        if (!isSignedIn && lookupEmail.trim()) params.set('email', lookupEmail.trim());

        const response = await fetch(`/api/returns?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          setError(t('returns.flow.tracker.notFound'));
          return;
        }
        setRequest(payload.returnRequest);
      } catch {
        setError(t('returns.flow.errors.generic'));
      } finally {
        setLoading(false);
      }
    },
    [isSignedIn, t],
  );

  // A signed-in customer arriving from a notification needs no extra input.
  useEffect(() => {
    if (initialReference && isSignedIn) void track(initialReference, '');
  }, [initialReference, isSignedIn, track]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-5">
        <div>
          <h2 className="typography-card-title text-hierarchy-title">
            {t('returns.flow.tracker.heading')}
          </h2>
          <p className="mt-1 typography-micro text-muted-foreground">
            {t('returns.flow.tracker.help')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-reference">
              {t('returns.flow.tracker.reference')}
            </Label>
            <Input
              id="track-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={t('returns.flow.tracker.referencePlaceholder')}
              autoComplete="off"
            />
          </div>

          {!isSignedIn && (
            <div className="space-y-2">
              <Label htmlFor="track-email">{t('returns.flow.tracker.email')}</Label>
              <Input
                id="track-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('returns.flow.lookup.emailPlaceholder')}
                autoComplete="email"
              />
            </div>
          )}
        </div>

        {error ? (
          <p className="typography-micro text-destructive-600">{error}</p>
        ) : null}

        <Button onClick={() => track(reference, email)} disabled={loading}>
          {loading
            ? t('returns.flow.tracker.searching')
            : t('returns.flow.tracker.submit')}
        </Button>
      </div>

      {request ? (
        <div className="space-y-6 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="typography-label text-hierarchy-title">
                {request.requestId}
              </p>
              <p className="mt-0.5 typography-micro text-muted-foreground">
                {t('returns.flow.tracker.submittedOn', {
                  date: formatDate(request.createdAt),
                })}
                {' · '}
                {request.orderId}
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 typography-micro">
              {t(`returns.rules.status.${request.status}`)}
            </span>
          </div>

          <div>
            <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
              {t('returns.flow.tracker.items')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {request.products.map((line, index) => (
                <li key={index} className="typography-body">
                  {line.quantity} × {line.productName}
                  {line.variant ? ` (${line.variant})` : ''}
                  <span className="ml-2 typography-micro text-muted-foreground">
                    {t(returnReasonKey(line.reason))}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
              {t('returns.flow.tracker.timeline')}
            </p>
            <ol className="mt-3 space-y-3">
              {request.statusHistory.map((entry, index) => {
                const isLatest = index === request.statusHistory.length - 1;
                return (
                  <li key={index} className="flex gap-3">
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        isLatest ? 'bg-primary' : 'bg-border',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="typography-label text-hierarchy-title">
                        {t(`returns.rules.status.${entry.status}`)}
                      </p>
                      <p className="typography-micro text-muted-foreground">
                        {formatDate(entry.timestamp)}
                        {entry.message ? ` · ${entry.message}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {request.refundAmount !== null ? (
            <div>
              <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                {t('returns.flow.tracker.refund')}
              </p>
              <p className="mt-1 typography-body">
                {t('returns.flow.tracker.refundIssued', {
                  amount: formatPrice(request.refundAmount),
                })}
              </p>
            </div>
          ) : null}

          {request.trackingNumber ? (
            <div>
              <p className="typography-micro font-semibold uppercase tracking-wide text-muted-foreground">
                {t('returns.flow.tracker.tracking')}
              </p>
              <p className="mt-1 typography-body">
                {[request.courierName, request.trackingNumber].filter(Boolean).join(' · ')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
