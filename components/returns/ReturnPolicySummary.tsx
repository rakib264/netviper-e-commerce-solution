'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { useLocalization } from '@/components/providers/LocalizationProvider';
import {
  readPolicyText,
  type ReturnPolicyContent,
} from '@/lib/returns/policy-content';

/**
 * The policy, as the customer reads it.
 *
 * Three headline facts, then the admin-authored sections. Text comes from
 * settings rather than the locale files, so a brand can reword its policy
 * without a deploy; the labels around it stay keyed.
 */
export function ReturnPolicySummary({
  policy,
}: {
  policy: ReturnPolicyContent | null;
}) {
  const { t } = useTranslation();
  const { locale } = useLocalization();

  if (!policy) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const highlights = [
    {
      key: 'window',
      value: t('returns.flow.summary.window', { days: policy.returnWindowDays }),
      help: t('returns.flow.summary.windowHelp'),
    },
    {
      key: 'exchange',
      value: t('returns.flow.summary.exchange', {
        days: policy.exchangeWindowDays,
      }),
      help: t('returns.flow.summary.exchangeHelp'),
    },
    {
      key: 'shipping',
      value: policy.freeReturnShipping
        ? t('returns.flow.summary.shippingFree')
        : t('returns.flow.summary.shippingPaid'),
      help: policy.freeReturnShipping
        ? t('returns.flow.summary.shippingFreeHelp')
        : t('returns.flow.summary.shippingPaidHelp'),
    },
  ];

  return (
    <div className="space-y-8">
      <dl className="grid gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-border bg-card p-4"
          >
            <dt className="typography-label text-hierarchy-title">{item.value}</dt>
            <dd className="mt-1 typography-micro text-muted-foreground">
              {item.help}
            </dd>
          </div>
        ))}
      </dl>

      <div className="divide-y divide-border">
        {policy.sections.map((section) => {
          const title = readPolicyText(section.title, locale);
          const body = readPolicyText(section.body, locale);
          if (!title && !body) return null;

          return (
            <section key={section.key} className="py-5 first:pt-0 last:pb-0">
              {title ? (
                <h3 className="typography-label text-hierarchy-title">{title}</h3>
              ) : null}
              {body ? (
                <p className="mt-1.5 typography-body text-muted-foreground">{body}</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default ReturnPolicySummary;
