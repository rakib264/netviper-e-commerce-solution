'use client';

import { AUDIENCE_LABELS, REWARD_TYPE_META, STATUS_META } from '@/components/admin/deals/constants';
import type { DealFormValues } from '@/components/admin/deals/types';
import { useCurrency } from '@/components/providers/LocalizationProvider';
import { dealStatus } from '@/lib/deals/status';
import { summarizeDeal } from '@/lib/deals/summary';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const DATE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

/**
 * The persistent right-hand card. It reads as one sentence on purpose — an
 * admin should be able to check a deal is right without re-walking the steps.
 */
export default function DealSummaryCard({ values }: { values: DealFormValues }) {
  const { formatPrice } = useCurrency();
  const meta = REWARD_TYPE_META[values.rewardType];
  const Icon = meta.icon;

  const sentence = useMemo(
    () =>
      summarizeDeal(
        {
          name: values.name,
          isActive: values.isActive,
          isExclusive: values.isExclusive,
          startsAt: values.startsAt ?? undefined,
          endsAt: values.endsAt ?? undefined,
          audience: values.audience,
          audienceGroupId: values.audienceGroupId,
          triggerType: values.triggerType,
          triggerValue: values.triggerValue,
          rewardType: values.rewardType,
          rewardConfig: values.rewardConfig as any,
          usageLimit: values.usageLimit === '' ? null : values.usageLimit,
          usedCount: 0,
        },
        {
          formatMoney: formatPrice,
          formatDate: (date) => DATE_FORMAT.format(date),
          giftName: values.rewardConfig.label,
          groupName: values.audienceGroupId,
        }
      ),
    [values, formatPrice]
  );

  const status =
    values.startsAt && values.endsAt
      ? dealStatus({
          isActive: values.isActive,
          startsAt: values.startsAt,
          endsAt: values.endsAt,
          usageLimit: values.usageLimit === '' ? null : values.usageLimit,
          usedCount: 0,
        })
      : null;

  return (
    <aside className="space-y-4 border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {meta.label}
        </span>
        {status && (
          <span className={cn('border px-2 py-0.5 text-xs font-medium', STATUS_META[status].className)}>
            {STATUS_META[status].label}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-foreground">{sentence}</p>

      <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
        <Row label="Audience" value={AUDIENCE_LABELS[values.audience]} />
        <Row label="Priority" value={String(values.priority)} />
        <Row
          label="Total limit"
          value={values.usageLimit === '' ? 'Unlimited' : String(values.usageLimit)}
        />
        <Row
          label="Per customer"
          value={
            values.usageLimitPerCustomer === '' ? 'Unlimited' : String(values.usageLimitPerCustomer)
          }
        />
      </dl>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
