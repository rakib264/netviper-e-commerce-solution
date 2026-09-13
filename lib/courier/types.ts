import type { CourierProviderId } from '@/lib/models/CourierIntegrationSettings';

export type { CourierProviderId };

/** The local `Courier.status` enum. Every provider status normalises into it. */
export type CourierStatus =
  | 'pending'
  | 'picked'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'cancelled';

/**
 * Everything a provider needs to create one consignment, in our own shape.
 * The adapters translate it — no call site ever writes a provider payload.
 */
export interface CourierDispatchInput {
  /** Our reference, echoed back on the provider's webhooks. */
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientSecondaryPhone?: string;
  recipientAddress: string;
  /** Free-text location used for Pathao's address resolution fallback. */
  recipientCityName?: string;
  recipientZoneName?: string;
  itemQuantity: number;
  /** Kilograms. Pathao clamps to 0.5–10. */
  itemWeight: number;
  itemDescription: string;
  specialInstruction?: string;
  /** 0 for a prepaid order. */
  amountToCollect: number;
  /** Pathao routing, when the admin resolved it for this consignment. */
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
  /**
   * Pathao per-consignment overrides. Unset means "use the stored defaults" —
   * only a caller that deliberately picked another pickup store or service
   * level for this one parcel fills them in.
   */
  pathaoStoreId?: string;
  pathaoDeliveryType?: number;
  pathaoItemType?: number;
}

export interface CourierDispatchResult {
  consignmentId: string;
  trackingCode?: string;
  /** The provider's own status label at creation. */
  providerStatus?: string;
  deliveryFee?: number;
  /** Normalised status to store locally. */
  status: CourierStatus;
  raw: unknown;
}

export interface CourierStatusResult {
  providerStatus: string;
  status: CourierStatus;
  raw: unknown;
}

/** Result of an admin "test connection" click. */
export interface CourierConnectionResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface CourierProvider {
  id: CourierProviderId;
  label: string;
  /** Verifies the stored credentials against the live API. */
  testConnection(): Promise<CourierConnectionResult>;
  createConsignment(input: CourierDispatchInput): Promise<CourierDispatchResult>;
  /** Reads the current status back. `null` when the provider cannot resolve it. */
  fetchStatus(ref: {
    consignmentId?: string;
    trackingCode?: string;
    merchantOrderId?: string;
  }): Promise<CourierStatusResult | null>;
}

/** Thrown by every adapter so routes can surface one consistent shape. */
export class CourierApiError extends Error {
  readonly provider: CourierProviderId;
  readonly statusCode?: number;
  readonly details?: unknown;

  constructor(
    provider: CourierProviderId,
    message: string,
    options: { statusCode?: number; details?: unknown } = {},
  ) {
    super(message);
    this.name = 'CourierApiError';
    this.provider = provider;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}
