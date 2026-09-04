'use client';

import { REWARD_TYPE_META, REWARD_TYPE_ORDER } from '@/components/admin/deals/constants';
import ProductVariantPicker from '@/components/admin/deals/ProductVariantPicker';
import WeightedPoolEditor, { type PoolEntry } from '@/components/admin/deals/WeightedPoolEditor';
import { StepField, StepHeader } from '@/components/admin/deals/steps/StepField';
import type { StepProps } from '@/components/admin/deals/types';
import { useCurrency } from '@/components/providers/LocalizationProvider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SETTLE_ON_BY_REWARD, type RewardType } from '@/lib/deals/types';
import { cn } from '@/lib/utils';

interface RewardStepProps extends StepProps {
  /** Resets the reward config and default copy when the type changes. */
  onRewardTypeChange: (rewardType: RewardType) => void;
  /** Locked once a deal has redemptions — its reward shape is on live orders. */
  rewardTypeLocked?: boolean;
}

export default function RewardStep({
  values,
  setFieldValue,
  errors,
  touched,
  onRewardTypeChange,
  rewardTypeLocked = false,
}: RewardStepProps) {
  const configError = (field: string) =>
    touched.rewardConfig ? (errors.rewardConfig as any)?.[field] : undefined;

  return (
    <div className="space-y-5">
      <StepHeader
        title="Reward"
        description="What the customer gets. The reward type decides when it settles — in the cart, or after delivery."
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {REWARD_TYPE_ORDER.map((rewardType) => {
          const meta = REWARD_TYPE_META[rewardType];
          const Icon = meta.icon;
          const selected = values.rewardType === rewardType;
          return (
            <button
              key={rewardType}
              type="button"
              disabled={rewardTypeLocked && !selected}
              onClick={() => onRewardTypeChange(rewardType)}
              className={cn(
                'flex items-start gap-3 border p-4 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary-50/60'
                  : 'border-border bg-card hover:bg-accent/40',
                rewardTypeLocked && !selected && 'cursor-not-allowed opacity-50'
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">{meta.label}</span>
                <span className="block text-xs text-muted-foreground">{meta.blurb}</span>
                <span className="block text-xs font-medium text-primary-700">
                  {meta.settlesLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {rewardTypeLocked && (
        <p className="border border-warning-200 bg-warning-50 px-4 py-3 text-xs text-warning-700">
          This deal already has redemptions, so its reward type is fixed. Create a new deal to
          offer something different.
        </p>
      )}

      <div className="border-t border-border pt-5">
        {values.rewardType === 'FIXED_DISCOUNT' && (
          <FixedDiscountFields values={values} setFieldValue={setFieldValue} error={configError('amount')} />
        )}
        {values.rewardType === 'FREE_GIFT' && (
          <FreeGiftFields values={values} setFieldValue={setFieldValue} error={configError('productId')} />
        )}
        {values.rewardType === 'LOYALTY_POINTS' && (
          <LoyaltyPointsFields values={values} setFieldValue={setFieldValue} configError={configError} />
        )}
        {values.rewardType === 'PUNCH_CARD' && (
          <PunchCardFields values={values} setFieldValue={setFieldValue} configError={configError} />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Settles on{' '}
        <span className="font-medium text-foreground">
          {SETTLE_ON_BY_REWARD[values.rewardType] === 'cart' ? 'the cart' : 'delivery'}
        </span>
        .
      </p>
    </div>
  );
}

function FixedDiscountFields({
  values,
  setFieldValue,
  error,
}: Pick<StepProps, 'values' | 'setFieldValue'> & { error?: string }) {
  const { currencySymbol } = useCurrency();
  return (
    <StepField
      label="Discount amount"
      htmlFor="reward-amount"
      error={error}
      hint="Taken off the subtotal. Never more than the cart is worth."
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
        <Input
          id="reward-amount"
          type="number"
          min={1}
          step="any"
          value={values.rewardConfig.amount ?? ''}
          onChange={(event) =>
            setFieldValue('rewardConfig', {
              ...values.rewardConfig,
              amount: Number(event.target.value),
            })
          }
        />
      </div>
    </StepField>
  );
}

function FreeGiftFields({
  values,
  setFieldValue,
  error,
}: Pick<StepProps, 'values' | 'setFieldValue'> & { error?: string }) {
  return (
    <div className="space-y-5">
      <StepField
        label="Gift product"
        error={error}
        hint="Only products marked giftable appear here. An out-of-stock gift is skipped silently rather than promised."
      >
        <ProductVariantPicker
          value={
            values.rewardConfig.productId
              ? {
                  productId: values.rewardConfig.productId,
                  variantId: values.rewardConfig.variantId ?? null,
                  label: values.rewardConfig.label,
                  image: values.rewardConfig.image,
                }
              : null
          }
          onChange={(selection) =>
            setFieldValue('rewardConfig', {
              ...values.rewardConfig,
              productId: selection?.productId ?? '',
              variantId: selection?.variantId ?? null,
              label: selection?.label,
              image: selection?.image,
            })
          }
        />
      </StepField>

      <StepField
        label="Quantity"
        htmlFor="reward-gift-qty"
        hint="The gift line is locked in the cart — the customer cannot change or remove it."
      >
        <Input
          id="reward-gift-qty"
          type="number"
          min={1}
          step={1}
          className="max-w-[8rem]"
          value={values.rewardConfig.qty ?? 1}
          onChange={(event) =>
            setFieldValue('rewardConfig', {
              ...values.rewardConfig,
              qty: Math.max(1, Number(event.target.value) || 1),
            })
          }
        />
      </StepField>
    </div>
  );
}

function LoyaltyPointsFields({
  values,
  setFieldValue,
  configError,
}: Pick<StepProps, 'values' | 'setFieldValue'> & { configError: (field: string) => string | undefined }) {
  const patch = (field: string, value: number) =>
    setFieldValue('rewardConfig', { ...values.rewardConfig, [field]: value });

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <StepField
        label="Points awarded"
        htmlFor="reward-points"
        error={configError('points')}
        hint="Granted as pending, released on delivery."
      >
        <Input
          id="reward-points"
          type="number"
          min={1}
          step={1}
          value={values.rewardConfig.points ?? ''}
          onChange={(event) => patch('points', Number(event.target.value))}
        />
      </StepField>

      <StepField
        label="Claim threshold"
        htmlFor="reward-threshold"
        error={configError('minClaimThreshold')}
        hint="Wallet claim stays disabled below this balance."
      >
        <Input
          id="reward-threshold"
          type="number"
          min={0}
          step={1}
          value={values.rewardConfig.minClaimThreshold ?? ''}
          onChange={(event) => patch('minClaimThreshold', Number(event.target.value))}
        />
      </StepField>

      <StepField
        label="Expires after (days)"
        htmlFor="reward-expiry"
        error={configError('expiresAfterDays')}
        hint="Counted from the day the points are released."
      >
        <Input
          id="reward-expiry"
          type="number"
          min={1}
          step={1}
          value={values.rewardConfig.expiresAfterDays ?? ''}
          onChange={(event) => patch('expiresAfterDays', Number(event.target.value))}
        />
      </StepField>
    </div>
  );
}

function PunchCardFields({
  values,
  setFieldValue,
  configError,
}: Pick<StepProps, 'values' | 'setFieldValue'> & { configError: (field: string) => string | undefined }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          label="Stamps to fill a card"
          htmlFor="reward-target"
          error={configError('targetCount')}
          hint="One stamp per qualifying order, added when the order is paid."
        >
          <Input
            id="reward-target"
            type="number"
            min={2}
            step={1}
            value={values.rewardConfig.targetCount ?? ''}
            onChange={(event) =>
              setFieldValue('rewardConfig', {
                ...values.rewardConfig,
                targetCount: Number(event.target.value),
              })
            }
          />
        </StepField>

        <StepField label="Repeatable" hint="A repeatable card resets to zero and can be filled again.">
          <div className="flex h-10 items-center gap-3">
            <Switch
              checked={values.rewardConfig.repeatable !== false}
              onCheckedChange={(checked) =>
                setFieldValue('rewardConfig', { ...values.rewardConfig, repeatable: checked })
              }
              aria-label="Repeatable"
            />
            <span className="text-sm text-muted-foreground">
              {values.rewardConfig.repeatable !== false ? 'Resets and repeats' : 'One card only'}
            </span>
          </div>
        </StepField>
      </div>

      <StepField
        label="Mystery box pool"
        hint="Weights are relative — the percentage beside each row is what the customer actually faces."
      >
        <WeightedPoolEditor
          entries={(values.rewardConfig.boxPool ?? []) as PoolEntry[]}
          error={configError('boxPool')}
          onChange={(entries) =>
            setFieldValue('rewardConfig', { ...values.rewardConfig, boxPool: entries })
          }
        />
      </StepField>
    </div>
  );
}
