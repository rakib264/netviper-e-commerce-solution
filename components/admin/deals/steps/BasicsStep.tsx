'use client';

import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getCurrencySymbol } from '@/lib/currency/format';

export default function BasicsStep({ values, setFieldValue, errors, touched }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        title="Basics"
        description="What this deal is called internally and where it sits in the running order."
      />

      <StepField
        label="Deal name"
        htmlFor="deal-name"
        error={touched.name ? (errors.name as string) : undefined}
        hint="Shown in the admin list and stored on every order this deal touches."
      >
        <Input
          id="deal-name"
          value={values.name}
          onChange={(event) => setFieldValue('name', event.target.value)}
          // Example copy, but the symbol still has to be the store's — this
          // read "Spend €2,000" on a taka store. The rest of this admin-only
          // form predates the i18n rule and is untouched here.
          placeholder={`Spend ${getCurrencySymbol()}2,000 and save ${getCurrencySymbol()}300`}
        />
      </StepField>

      <StepField
        label="Internal note"
        htmlFor="deal-note"
        hint="Never shown to customers."
      >
        <Textarea
          id="deal-note"
          rows={3}
          value={values.internalNote}
          onChange={(event) => setFieldValue('internalNote', event.target.value)}
          placeholder="Autumn campaign, agreed with buying on 12 Aug."
        />
      </StepField>

      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          label="Priority"
          htmlFor="deal-priority"
          error={touched.priority ? (errors.priority as string) : undefined}
          hint="Lower runs first. Drag the list to renumber."
        >
          <Input
            id="deal-priority"
            type="number"
            min={0}
            value={values.priority}
            onChange={(event) => setFieldValue('priority', Number(event.target.value))}
          />
        </StepField>

        <StepField label="Active" hint="A paused deal never applies, whatever its dates say.">
          <div className="flex h-10 items-center gap-3">
            <Switch
              checked={values.isActive}
              onCheckedChange={(checked) => setFieldValue('isActive', checked)}
              aria-label="Active"
            />
            <span className="text-sm text-muted-foreground">
              {values.isActive ? 'Running when in window' : 'Paused'}
            </span>
          </div>
        </StepField>
      </div>

      <div className="flex items-start gap-3 border border-border bg-muted/40 p-4">
        <Switch
          checked={values.isExclusive}
          onCheckedChange={(checked) => setFieldValue('isExclusive', checked)}
          aria-label="Exclusive"
          className="mt-0.5"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Exclusive</p>
          <p className="text-xs text-muted-foreground">
            Once this deal applies, no lower-priority cart deal is evaluated. Points and punch
            cards still accrue — they settle after delivery and never change what is paid today.
          </p>
        </div>
      </div>
    </div>
  );
}
