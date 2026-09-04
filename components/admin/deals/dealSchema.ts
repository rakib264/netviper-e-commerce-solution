import type { DealFormValues } from '@/components/admin/deals/types';
import { DEFAULT_REWARD_CONFIG, DEFAULT_STOREFRONT_COPY } from '@/components/admin/deals/constants';
import type { RewardType } from '@/lib/deals/types';
import * as Yup from 'yup';

/** Which form fields belong to which step, so "Next" can validate just that step. */
export const STEP_FIELDS: string[][] = [
  ['name', 'priority'],
  ['startsAt', 'endsAt'],
  ['audience', 'audienceGroupId'],
  ['triggerType', 'triggerValue'],
  ['rewardType', 'rewardConfig'],
  ['usageLimit', 'usageLimitPerCustomer'],
  ['storefrontCopy'],
];

export const STEP_TITLES = [
  'Basics',
  'Schedule',
  'Audience',
  'Trigger',
  'Reward',
  'Limits',
  'Copy',
];

const optionalPositiveInteger = Yup.mixed()
  .nullable()
  .test('positive-or-empty', 'Must be greater than 0', (value) => {
    if (value === '' || value === null || value === undefined) return true;
    return Number.isInteger(Number(value)) && Number(value) > 0;
  });

function rewardConfigSchema(rewardType: RewardType) {
  switch (rewardType) {
    case 'FIXED_DISCOUNT':
      return Yup.object({
        amount: Yup.number().moreThan(0, 'Enter a discount above 0').required('A discount amount is required'),
      });

    case 'FREE_GIFT':
      return Yup.object({
        productId: Yup.string().required('Pick a gift product'),
        qty: Yup.number().integer().min(1, 'At least 1').required(),
      });

    case 'LOYALTY_POINTS':
      return Yup.object({
        points: Yup.number().integer().moreThan(0, 'Award at least 1 point').required('Points are required'),
        minClaimThreshold: Yup.number().min(0, 'Cannot be negative').required(),
        expiresAfterDays: Yup.number().integer().min(1, 'At least 1 day').required(),
      });

    case 'PUNCH_CARD':
      return Yup.object({
        targetCount: Yup.number()
          .integer()
          .min(2, 'A card needs at least 2 stamps')
          .required('A stamp target is required'),
        boxPool: Yup.array()
          .of(
            Yup.object({
              productId: Yup.string().required('Every entry needs a product'),
              weight: Yup.number().min(0, 'Weight cannot be negative').required(),
            })
          )
          .min(1, 'Add at least one product to the pool')
          .test('has-weight', 'At least one entry needs a weight above 0', (pool) =>
            (pool || []).some((entry: any) => Number(entry?.weight) > 0)
          ),
      });

    default:
      return Yup.object();
  }
}

export function buildDealSchema(rewardType: RewardType) {
  return Yup.object({
    name: Yup.string().trim().required('A deal name is required'),
    priority: Yup.number().integer('Priority must be a whole number').min(0, 'Cannot be negative').required(),
    startsAt: Yup.date().nullable().required('A start date is required'),
    endsAt: Yup.date()
      .nullable()
      .required('An end date is required')
      .when('startsAt', ([startsAt], schema) =>
        startsAt ? schema.min(startsAt, 'The end must be after the start') : schema
      ),
    audience: Yup.string().required(),
    audienceGroupId: Yup.string().when('audience', {
      is: 'customer_group',
      then: (schema) => schema.trim().required('Pick a customer group'),
      otherwise: (schema) => schema.notRequired(),
    }),
    triggerType: Yup.string().required(),
    triggerValue: Yup.number()
      .moreThan(0, 'The trigger must be above 0')
      .required('A trigger value is required')
      .when('triggerType', {
        is: 'item_count_min',
        then: (schema) => schema.integer('Item counts must be whole numbers'),
      }),
    usageLimit: optionalPositiveInteger,
    usageLimitPerCustomer: optionalPositiveInteger,
    rewardConfig: rewardConfigSchema(rewardType),
    storefrontCopy: Yup.object({
      locked: Yup.string().trim().required('Locked copy cannot be empty'),
      unlocked: Yup.string().trim().required('Unlocked copy cannot be empty'),
      badge: Yup.string().trim().required('A badge label is required'),
    }),
  });
}

/** A blank deal, optionally seeded from one of the four templates. */
export function emptyDealForm(
  rewardType: RewardType = 'FIXED_DISCOUNT',
  seed?: Partial<DealFormValues>
): DealFormValues {
  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    name: '',
    internalNote: '',
    isActive: true,
    priority: 100,
    isExclusive: false,
    startsAt: now,
    endsAt: inThirtyDays,
    audience: 'all',
    audienceGroupId: '',
    triggerType: 'subtotal_min',
    triggerValue: 2000,
    rewardType,
    rewardConfig: { ...DEFAULT_REWARD_CONFIG[rewardType] },
    usageLimit: '',
    usageLimitPerCustomer: '',
    storefrontCopy: { ...DEFAULT_STOREFRONT_COPY[rewardType] },
    ...seed,
  };
}
