'use client';

import CartPreviewPanel from '@/components/admin/deals/CartPreviewPanel';
import DealSummaryCard from '@/components/admin/deals/DealSummaryCard';
import { DEFAULT_REWARD_CONFIG, DEFAULT_STOREFRONT_COPY } from '@/components/admin/deals/constants';
import { STEP_FIELDS, STEP_TITLES, buildDealSchema, emptyDealForm } from '@/components/admin/deals/dealSchema';
import AudienceStep from '@/components/admin/deals/steps/AudienceStep';
import BasicsStep from '@/components/admin/deals/steps/BasicsStep';
import CopyStep from '@/components/admin/deals/steps/CopyStep';
import LimitsStep from '@/components/admin/deals/steps/LimitsStep';
import RewardStep from '@/components/admin/deals/steps/RewardStep';
import ScheduleStep from '@/components/admin/deals/steps/ScheduleStep';
import TriggerStep from '@/components/admin/deals/steps/TriggerStep';
import type { AdminDeal, DealFormValues } from '@/components/admin/deals/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToastWithTypes } from '@/hooks/use-toast';
import type { RewardType } from '@/lib/deals/types';
import { cn } from '@/lib/utils';
import { Formik, Form as FormikForm } from 'formik';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface DealEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null when creating. */
  deal: AdminDeal | null;
  /** Reward type to seed a new deal with, from the template cards. */
  seedRewardType?: RewardType;
  seedValues?: Partial<DealFormValues>;
  onSaved: () => void;
}

/**
 * The seven-step editor. Steps validate independently so an admin can only
 * move forward past a step that is actually complete, but every step stays
 * reachable from the rail once visited.
 */
export default function DealEditorDialog({
  open,
  onOpenChange,
  deal,
  seedRewardType = 'FIXED_DISCOUNT',
  seedValues,
  onSaved,
}: DealEditorDialogProps) {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToastWithTypes();

  const initialValues = useMemo<DealFormValues>(() => {
    if (!deal) return emptyDealForm(seedRewardType, seedValues);
    return {
      name: deal.name,
      internalNote: deal.internalNote || '',
      isActive: deal.isActive,
      priority: deal.priority,
      isExclusive: deal.isExclusive,
      startsAt: deal.startsAt ? new Date(deal.startsAt) : null,
      endsAt: deal.endsAt ? new Date(deal.endsAt) : null,
      audience: deal.audience,
      audienceGroupId: deal.audienceGroupId || '',
      triggerType: deal.triggerType,
      triggerValue: deal.triggerValue,
      rewardType: deal.rewardType,
      rewardConfig: { ...deal.rewardConfig },
      usageLimit: deal.usageLimit ?? '',
      usageLimitPerCustomer: deal.usageLimitPerCustomer ?? '',
      storefrontCopy: { ...deal.storefrontCopy },
    };
    // `open` is in the deps so reopening the dialog re-seeds from the row.
  }, [deal, seedRewardType, seedValues, open]);

  const handleSubmit = async (values: DealFormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        startsAt: values.startsAt?.toISOString(),
        endsAt: values.endsAt?.toISOString(),
        usageLimit: values.usageLimit === '' ? null : values.usageLimit,
        usageLimitPerCustomer:
          values.usageLimitPerCustomer === '' ? null : values.usageLimitPerCustomer,
      };

      const res = await fetch(deal ? `/api/admin/deals/${deal.id}` : '/api/admin/deals', {
        method: deal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        error(data.error || 'Failed to save deal');
        return;
      }

      success(deal ? 'Deal updated' : 'Deal created');
      onSaved();
      onOpenChange(false);
      setStep(0);
      setFurthest(0);
    } catch {
      error('Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  const isLastStep = step === STEP_TITLES.length - 1;
  // A deal already on live orders keeps its reward shape — the snapshot on
  // those orders assumes it.
  const rewardTypeLocked = Boolean(deal && deal.redemptions > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{deal ? `Edit ${deal.name}` : 'New deal'}</DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={buildDealSchema(initialValues.rewardType)}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue, setTouched, validateForm, submitForm }) => {
            const goToStep = async (next: number) => {
              if (next <= step || next <= furthest) {
                setStep(next);
                return;
              }
              const formErrors = await validateForm();
              const fields = STEP_FIELDS[step];
              const blocked = fields.some((field) => (formErrors as any)[field]);
              if (blocked) {
                setTouched(
                  fields.reduce((acc, field) => ({ ...acc, [field]: true }), touched as any),
                  false
                );
                return;
              }
              setStep(next);
              setFurthest((current) => Math.max(current, next));
            };

            const changeRewardType = (rewardType: RewardType) => {
              // Reward configs share no fields, so switching type starts from
              // that type's defaults rather than carrying stale keys across.
              setFieldValue('rewardType', rewardType);
              setFieldValue('rewardConfig', { ...DEFAULT_REWARD_CONFIG[rewardType] });
              setFieldValue('storefrontCopy', { ...DEFAULT_STOREFRONT_COPY[rewardType] });
              if (rewardType === 'PUNCH_CARD') setFieldValue('triggerType', 'item_count_min');
            };

            const stepProps = { values, setFieldValue, errors: errors as any, touched: touched as any };

            return (
              <FormikForm>
                <div className="grid gap-0 lg:grid-cols-[13rem_1fr_19rem]">
                  <nav className="border-b border-border px-4 py-4 lg:border-b-0 lg:border-r">
                    <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                      {STEP_TITLES.map((title, index) => {
                        const state =
                          index === step ? 'current' : index <= furthest ? 'visited' : 'locked';
                        return (
                          <li key={title} className="shrink-0">
                            <button
                              type="button"
                              onClick={() => goToStep(index)}
                              disabled={state === 'locked'}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                                state === 'current' && 'bg-primary-50 font-medium text-primary-700',
                                state === 'visited' && 'text-foreground hover:bg-accent',
                                state === 'locked' && 'cursor-not-allowed text-muted-foreground/60'
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center border text-xs',
                                  index < furthest || (index < step)
                                    ? 'border-success-300 bg-success-50 text-success-700'
                                    : 'border-border'
                                )}
                              >
                                {index < step ? <Check className="h-3 w-3" /> : index + 1}
                              </span>
                              {title}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>

                  <ScrollArea className="max-h-[60vh]">
                    <div className="px-6 py-5">
                      {step === 0 && <BasicsStep {...stepProps} />}
                      {step === 1 && <ScheduleStep {...stepProps} />}
                      {step === 2 && <AudienceStep {...stepProps} />}
                      {step === 3 && <TriggerStep {...stepProps} />}
                      {step === 4 && (
                        <RewardStep
                          {...stepProps}
                          onRewardTypeChange={changeRewardType}
                          rewardTypeLocked={rewardTypeLocked}
                        />
                      )}
                      {step === 5 && <LimitsStep {...stepProps} />}
                      {step === 6 && <CopyStep {...stepProps} />}
                    </div>
                  </ScrollArea>

                  <ScrollArea className="max-h-[60vh] border-t border-border lg:border-l lg:border-t-0">
                    <div className="space-y-4 px-4 py-5">
                      <DealSummaryCard values={values} />
                      {step >= 4 && <CartPreviewPanel values={values} />}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex items-center justify-between border-t border-border px-6 py-4">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={step === 0}
                    onClick={() => setStep((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Step {step + 1} of {STEP_TITLES.length}
                    </span>
                    {isLastStep ? (
                      <Button type="button" disabled={saving} onClick={submitForm}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {deal ? 'Save changes' : 'Create deal'}
                      </Button>
                    ) : (
                      <Button type="button" onClick={() => goToStep(step + 1)}>
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </FormikForm>
            );
          }}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
