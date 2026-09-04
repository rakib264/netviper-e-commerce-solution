'use client';

import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import { useCurrency } from '@/components/providers/LocalizationProvider';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function TriggerStep({ values, setFieldValue, errors, touched }: StepProps) {
  const { currencySymbol } = useCurrency();
  const isSubtotal = values.triggerType === 'subtotal_min';

  return (
    <div className="space-y-5">
      <StepHeader
        title="Trigger"
        description="What the cart has to reach before the reward unlocks. Gift lines and products excluded from promotions never count."
      />

      <RadioGroup
        value={values.triggerType}
        onValueChange={(next) => setFieldValue('triggerType', next)}
        className="grid gap-2 sm:grid-cols-2"
      >
        <label
          htmlFor="trigger-subtotal"
          className="flex cursor-pointer items-start gap-3 border border-border bg-card p-4 hover:bg-accent/40"
        >
          <RadioGroupItem value="subtotal_min" id="trigger-subtotal" className="mt-0.5" />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">Cart subtotal</span>
            <span className="block text-xs text-muted-foreground">Spend at least an amount.</span>
          </span>
        </label>
        <label
          htmlFor="trigger-items"
          className="flex cursor-pointer items-start gap-3 border border-border bg-card p-4 hover:bg-accent/40"
        >
          <RadioGroupItem value="item_count_min" id="trigger-items" className="mt-0.5" />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">Item count</span>
            <span className="block text-xs text-muted-foreground">Buy at least N qualifying items.</span>
          </span>
        </label>
      </RadioGroup>

      <StepField
        label={isSubtotal ? 'Subtotal threshold' : 'Minimum qualifying items'}
        htmlFor="trigger-value"
        error={touched.triggerValue ? (errors.triggerValue as string) : undefined}
        hint={
          isSubtotal
            ? 'Measured against the subtotal before shipping, tax and coupons.'
            : 'Counted across every qualifying line in the cart.'
        }
      >
        <div className="flex items-center gap-2">
          {isSubtotal && (
            <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
          )}
          <Input
            id="trigger-value"
            type="number"
            min={isSubtotal ? 1 : 1}
            step={isSubtotal ? 'any' : 1}
            value={values.triggerValue}
            onChange={(event) => setFieldValue('triggerValue', Number(event.target.value))}
          />
        </div>
      </StepField>
    </div>
  );
}
