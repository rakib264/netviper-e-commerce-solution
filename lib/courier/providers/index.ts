import { PathaoProvider } from '@/lib/courier/providers/pathao';
import { SteadfastProvider } from '@/lib/courier/providers/steadfast';
import {
  getCourierIntegrationSettings,
  type CourierIntegrationDoc,
} from '@/lib/courier/settings';
import {
  CourierApiError,
  type CourierProvider,
  type CourierProviderId,
} from '@/lib/courier/types';

export const COURIER_PROVIDER_IDS: CourierProviderId[] = ['pathao', 'steadfast'];

export function isCourierProviderId(value: unknown): value is CourierProviderId {
  return value === 'pathao' || value === 'steadfast';
}

/**
 * The adapter for one provider, sharing a single settings document so a
 * dispatch loop does not re-read (or re-mint a Pathao token) per consignment.
 */
export async function getCourierProvider(
  id: CourierProviderId,
  settings?: CourierIntegrationDoc,
): Promise<CourierProvider> {
  const resolved = settings ?? (await getCourierIntegrationSettings());
  switch (id) {
    case 'pathao':
      return new PathaoProvider(resolved);
    case 'steadfast':
      return new SteadfastProvider(resolved);
    default:
      throw new CourierApiError(
        id,
        `Unknown courier provider: ${id}`,
      );
  }
}

export { PathaoProvider, SteadfastProvider };
