'use client';

import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import { Input } from '@/components/ui/input';
import { COPY_PLACEHOLDERS } from '@/lib/deals/copy';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

/**
 * Which placeholders are meaningful for the currently chosen reward type.
 * `{reward}` resolves for all four — the money off, the gift name, the points,
 * the box — so it is always on offer.
 */
function relevantPlaceholders(rewardType: string): string[] {
  if (rewardType === 'LOYALTY_POINTS') return ['remaining', 'points', 'reward'];
  if (rewardType === 'FREE_GIFT') return ['remaining', 'gift', 'reward'];
  return ['remaining', 'reward'];
}

export default function CopyStep({ values, setFieldValue, errors, touched }: StepProps) {
  const allowed = relevantPlaceholders(values.rewardType);
  const copyError = (field: string) =>
    touched.storefrontCopy ? (errors.storefrontCopy as any)?.[field] : undefined;

  const insert = (field: 'locked' | 'unlocked' | 'badge', placeholder: string) => {
    setFieldValue('storefrontCopy', {
      ...values.storefrontCopy,
      [field]: `${values.storefrontCopy[field]}{${placeholder}}`,
    });
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="Storefront copy"
        description="What the customer reads in the cart. The preview beside this form updates as you type."
      />

      <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/40 px-4 py-3">
        <span className="text-xs font-medium text-foreground">Placeholders:</span>
        {COPY_PLACEHOLDERS.map((placeholder) => (
          <code
            key={placeholder}
            className={`px-1.5 py-0.5 text-xs ${
              allowed.includes(placeholder)
                ? 'bg-primary-50 text-primary-700'
                : 'bg-muted text-muted-foreground line-through'
            }`}
          >
            {`{${placeholder}}`}
          </code>
        ))}
        <span className="text-xs text-muted-foreground">
          Struck-through placeholders do nothing for this reward type.
        </span>
      </div>

      <StepField
        label="Before unlock"
        htmlFor="copy-locked"
        error={copyError('locked')}
        hint="Shown while the cart is still short of the trigger."
      >
        <Textarea
          id="copy-locked"
          rows={2}
          value={values.storefrontCopy.locked}
          onChange={(event) =>
            setFieldValue('storefrontCopy', { ...values.storefrontCopy, locked: event.target.value })
          }
        />
        <PlaceholderButtons allowed={allowed} onInsert={(name) => insert('locked', name)} />
      </StepField>

      <StepField
        label="After unlock"
        htmlFor="copy-unlocked"
        error={copyError('unlocked')}
        hint="Shown once the trigger is met, and in the unlock toast."
      >
        <Textarea
          id="copy-unlocked"
          rows={2}
          value={values.storefrontCopy.unlocked}
          onChange={(event) =>
            setFieldValue('storefrontCopy', {
              ...values.storefrontCopy,
              unlocked: event.target.value,
            })
          }
        />
        <PlaceholderButtons allowed={allowed} onInsert={(name) => insert('unlocked', name)} />
      </StepField>

      <StepField
        label="Reward badge"
        htmlFor="copy-badge"
        error={copyError('badge')}
        hint="The short label on the reward preview chip. Keep it to a few words."
      >
        <Input
          id="copy-badge"
          value={values.storefrontCopy.badge}
          onChange={(event) =>
            setFieldValue('storefrontCopy', { ...values.storefrontCopy, badge: event.target.value })
          }
        />
        <PlaceholderButtons allowed={allowed} onInsert={(name) => insert('badge', name)} />
      </StepField>
    </div>
  );
}

function PlaceholderButtons({
  allowed,
  onInsert,
}: {
  allowed: string[];
  onInsert: (placeholder: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {allowed.map((placeholder) => (
        <Button
          key={placeholder}
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onInsert(placeholder)}
        >
          {`{${placeholder}}`}
        </Button>
      ))}
    </div>
  );
}
