'use client';

import { AUDIENCE_LABELS } from '@/components/admin/deals/constants';
import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DEAL_AUDIENCES, type DealAudience } from '@/lib/deals/types';
import { useEffect, useState } from 'react';

const AUDIENCE_HINTS: Record<DealAudience, string> = {
  all: 'Every shopper, signed in or not.',
  new_customers: 'Signed-in customers with no completed order yet. Guests do not qualify.',
  customer_group: 'Customers tagged with a segment on their account.',
};

export default function AudienceStep({ values, setFieldValue, errors, touched }: StepProps) {
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/admin/deals/customer-groups')
      .then((res) => res.json())
      .then((data) => setGroups(Array.isArray(data.groups) ? data.groups : []))
      .catch(() => setGroups([]));
  }, []);

  return (
    <div className="space-y-5">
      <StepHeader title="Audience" description="Who this deal is allowed to fire for." />

      <RadioGroup
        value={values.audience}
        onValueChange={(next) => setFieldValue('audience', next)}
        className="space-y-2"
      >
        {DEAL_AUDIENCES.map((audience) => (
          <label
            key={audience}
            htmlFor={`audience-${audience}`}
            className="flex cursor-pointer items-start gap-3 border border-border bg-card p-4 hover:bg-accent/40"
          >
            <RadioGroupItem value={audience} id={`audience-${audience}`} className="mt-0.5" />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">
                {AUDIENCE_LABELS[audience]}
              </span>
              <span className="block text-xs text-muted-foreground">
                {AUDIENCE_HINTS[audience]}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {values.audience === 'customer_group' && (
        <StepField
          label="Customer group"
          htmlFor="deal-group"
          error={touched.audienceGroupId ? (errors.audienceGroupId as string) : undefined}
          hint={
            groups.length > 0
              ? `In use: ${groups.join(', ')}`
              : 'No groups are tagged on any account yet.'
          }
        >
          <Input
            id="deal-group"
            list="deal-customer-groups"
            value={values.audienceGroupId}
            onChange={(event) => setFieldValue('audienceGroupId', event.target.value)}
            placeholder="vip"
          />
          <datalist id="deal-customer-groups">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </StepField>
      )}
    </div>
  );
}
