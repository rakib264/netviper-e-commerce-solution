'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  CURRENCY_LIST,
  normalizeCurrency,
  type CurrencyCode,
} from '@/lib/currency/config';
import { createCurrencyFormatter } from '@/lib/currency/format';
import { cn } from '@/lib/utils';
import { Check, Coins, Info } from 'lucide-react';
import { useMemo } from 'react';

interface CurrencySettingsCardProps {
  value: string;
  onChange: (currency: CurrencyCode) => void;
}

/** Amounts chosen to show grouping, a small price and the zero case. */
const PREVIEW_AMOUNTS = [49, 1249, 128500, 0];

export function CurrencySettingsCard({ value, onChange }: CurrencySettingsCardProps) {
  const selected = normalizeCurrency(value);
  const formatter = useMemo(() => createCurrencyFormatter(selected), [selected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins size={20} />
          <span>Currency</span>
        </CardTitle>
        <p className="font-paragraph text-sm text-muted-foreground">
          Sets the symbol, grouping and symbol placement used for every price on the
          storefront — product cards, cart, checkout and order history.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Store currency</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CURRENCY_LIST.map((currency) => {
              const active = currency.code === selected;
              const sample = createCurrencyFormatter(currency.code).format(1249);
              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => onChange(currency.code)}
                  aria-pressed={active}
                  className={cn(
                    'group flex items-start justify-between gap-3 rounded-lg border p-4 text-left transition-all',
                    active
                      ? 'border-ring ring-2 ring-ring/30'
                      : 'border-border hover:border-ring/60',
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="font-title text-sm font-medium text-foreground">
                        {currency.code}
                      </span>
                      <span className="font-price text-base text-foreground">
                        {currency.symbol}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-paragraph text-sm text-muted-foreground">
                      {currency.label}
                    </span>
                    <span className="mt-2 block font-price text-sm tabular-nums text-foreground">
                      {sample}
                    </span>
                  </span>
                  {active ? (
                    <Check size={16} className="mt-0.5 shrink-0 text-foreground" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Preview</Label>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted p-4 sm:grid-cols-4">
            {PREVIEW_AMOUNTS.map((amount) => (
              <div key={amount} className="space-y-1">
                <p className="font-caption text-[11px] uppercase tracking-wide text-subtle-foreground">
                  {amount.toLocaleString('en-US')}
                </p>
                <p className="font-price text-lg tabular-nums text-foreground">
                  {formatter.format(amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 rounded-lg border border-border p-4">
          <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-title text-sm font-medium text-foreground">
              Display only — amounts are not converted
            </p>
            <p className="font-paragraph text-sm text-muted-foreground">
              Product prices, shipping rates and past orders keep their stored numeric
              values; only the way they are written changes. Switch currency alongside
              a price review, not on its own.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 font-caption text-xs text-subtle-foreground">
              <span>Payment gateway settlement currency is configured separately under</span>
              <Badge variant="outline" className="font-label text-[10px]">
                Payment
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
