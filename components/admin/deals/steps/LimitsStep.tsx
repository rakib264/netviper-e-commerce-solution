'use client';

import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import { Input } from '@/components/ui/input';

export default function LimitsStep({ values, setFieldValue, errors, touched }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        title="Limits"
        description="Leave a field empty for no cap. Usage is booked when an order is placed, so an abandoned cart never burns a limited deal."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          label="Total redemptions"
          htmlFor="limit-total"
          error={touched.usageLimit ? (errors.usageLimit as string) : undefined}
          hint="Across every customer. The deal stops applying once it is reached."
        >
          <Input
            id="limit-total"
            type="number"
            min={1}
            step={1}
            placeholder="Unlimited"
            value={values.usageLimit}
            onChange={(event) =>
              setFieldValue('usageLimit', event.target.value === '' ? '' : Number(event.target.value))
            }
          />
        </StepField>

        <StepField
          label="Per customer"
          htmlFor="limit-customer"
          error={touched.usageLimitPerCustomer ? (errors.usageLimitPerCustomer as string) : undefined}
          hint="Only enforced for signed-in customers — a guest cannot be counted."
        >
          <Input
            id="limit-customer"
            type="number"
            min={1}
            step={1}
            placeholder="Unlimited"
            value={values.usageLimitPerCustomer}
            onChange={(event) =>
              setFieldValue(
                'usageLimitPerCustomer',
                event.target.value === '' ? '' : Number(event.target.value)
              )
            }
          />
        </StepField>
      </div>
    </div>
  );
}
