'use client';

import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import DateTimePicker from '@/components/ui/datetime-picker';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ScheduleStep({ values, setFieldValue, errors, touched }: StepProps) {
  // Resolved client-side: the browser is the only place that knows which zone
  // the admin is actually reading these times in.
  const [timezone, setTimezone] = useState('');
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time');
  }, []);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Schedule"
        description="A deal only ever runs inside this window. Both ends are required."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          label="Starts at"
          error={touched.startsAt ? (errors.startsAt as string) : undefined}
        >
          <DateTimePicker
            selected={values.startsAt}
            onChange={(date) => setFieldValue('startsAt', date)}
            placeholder="Pick a start"
            error={Boolean(touched.startsAt && errors.startsAt)}
          />
        </StepField>

        <StepField label="Ends at" error={touched.endsAt ? (errors.endsAt as string) : undefined}>
          <DateTimePicker
            selected={values.endsAt}
            onChange={(date) => setFieldValue('endsAt', date)}
            placeholder="Pick an end"
            minDate={values.startsAt ?? undefined}
            error={Boolean(touched.endsAt && errors.endsAt)}
          />
        </StepField>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Times are entered in {timezone || 'your local time'} and stored in UTC, so the window
        holds wherever the customer is.
      </p>
    </div>
  );
}
