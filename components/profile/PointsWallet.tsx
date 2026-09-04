'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToastWithTypes } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Clock, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

export interface LedgerEntry {
  id: string;
  points: number;
  status: 'pending' | 'available' | 'redeemed' | 'expired';
  entryType: 'grant' | 'redemption' | 'reversal' | 'expiry';
  dealName: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface PointsSummary {
  available: number;
  pending: number;
  lifetime: number;
  minClaimThreshold: number;
  claim: { allowed: boolean; shortfall: number };
  ledger: LedgerEntry[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The points wallet. Pending rows are labelled rather than hidden — a customer
 * who has just ordered should be able to see the points they are owed and why
 * they cannot spend them yet.
 */
/** Literal keys so the locale coverage test can see them. */
function useEntryLabel() {
  const { t } = useTranslation();
  return (entryType: LedgerEntry['entryType']) => {
    if (entryType === 'redemption') return t('profile.rewards.entry.redemption');
    if (entryType === 'reversal') return t('profile.rewards.entry.reversal');
    if (entryType === 'expiry') return t('profile.rewards.entry.expiry');
    return t('profile.rewards.entry.grant');
  };
}

export default function PointsWallet({
  points,
  onClaimed,
}: {
  points: PointsSummary;
  onClaimed: () => void;
}) {
  const { t } = useTranslation();
  const { success, error } = useToastWithTypes();
  const entryLabel = useEntryLabel();
  const [claiming, setClaiming] = useState(false);

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await fetch('/api/profile/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || t('profile.rewards.claimFailed'));
        return;
      }
      success(t('profile.rewards.claimed', { points: data.points }));
      onClaimed();
    } catch {
      error(t('profile.rewards.claimFailed'));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-none hover:shadow-none">
      <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-5 py-4 sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Sparkles size={15} />
        </span>
        <CardTitle className="typography-card-title text-hierarchy-title">
          {t('profile.rewards.walletTitle')}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t('profile.rewards.available')} value={points.available} emphasis />
          <Stat label={t('profile.rewards.pending')} value={points.pending} />
          <Stat label={t('profile.rewards.lifetime')} value={points.lifetime} />
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            disabled={!points.claim.allowed || claiming}
            onClick={claim}
          >
            {claiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('profile.rewards.redeem')}
          </Button>
          {!points.claim.allowed && (
            <p className="text-center text-sm text-muted-foreground">
              {t('profile.rewards.earnMoreToRedeem', { count: points.claim.shortfall })}
            </p>
          )}
        </div>

        <Separator className="bg-border" />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t('profile.rewards.historyTitle')}
          </h3>

          {points.ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('profile.rewards.historyEmpty')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {points.ledger.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {entry.dealName || entryLabel(entry.entryType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DATE_FORMAT.format(new Date(entry.createdAt))}
                      {entry.status === 'pending' && (
                        <span className="ml-2 inline-flex items-center gap-1 text-warning-700">
                          <Clock className="h-3 w-3" />
                          {t('profile.rewards.unlocksAfterDelivery')}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      entry.points > 0 ? 'text-success-700' : 'text-muted-foreground'
                    )}
                  >
                    {entry.points > 0 ? '+' : ''}
                    {entry.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        'border p-3 text-center',
        emphasis ? 'border-primary-200 bg-primary-50' : 'border-border bg-muted/40'
      )}
    >
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          emphasis ? 'text-primary-700' : 'text-foreground'
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
