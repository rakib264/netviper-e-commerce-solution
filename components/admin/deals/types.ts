import type { DealStatus } from '@/lib/deals/status';
import type {
  DealAudience,
  DealDefinition,
  RewardType,
  StorefrontCopy,
  TriggerType,
} from '@/lib/deals/types';

/** A deal row as the admin list endpoint returns it. */
export interface AdminDeal extends DealDefinition {
  status: DealStatus;
  redemptions: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The editor's working shape. Dates are live `Date` objects while the form is
 * open and only become ISO strings on submit, so the picker never has to parse
 * its own output back.
 */
export interface DealFormValues {
  name: string;
  internalNote: string;
  isActive: boolean;
  priority: number;
  isExclusive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  audience: DealAudience;
  audienceGroupId: string;
  triggerType: TriggerType;
  triggerValue: number;
  rewardType: RewardType;
  rewardConfig: Record<string, any>;
  usageLimit: number | '';
  usageLimitPerCustomer: number | '';
  storefrontCopy: StorefrontCopy;
}

export interface StepProps {
  values: DealFormValues;
  setFieldValue: (field: string, value: any) => void;
  errors: Record<string, any>;
  touched: Record<string, any>;
}
