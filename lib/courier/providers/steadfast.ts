import { normalizeBdPhone } from '@/lib/courier/providers/pathao';
import { mapSteadfastStatus } from '@/lib/courier/status-map';
import {
  getCourierIntegrationSettings,
  resolveSteadfastBaseUrl,
  type CourierIntegrationDoc,
} from '@/lib/courier/settings';
import {
  CourierApiError,
  type CourierConnectionResult,
  type CourierDispatchInput,
  type CourierDispatchResult,
  type CourierProvider,
  type CourierStatusResult,
} from '@/lib/courier/types';

/**
 * Steadfast Courier API (`/api/v1/*`).
 *
 * Authentication is a static `Api-Key` / `Secret-Key` header pair — there is
 * no token to mint or cache, so this adapter is a thin translation layer.
 */

const PATH = {
  createOrder: '/create_order',
  bulkOrder: '/create_order/bulk-order',
  statusByCid: (id: string) => `/status_by_cid/${encodeURIComponent(id)}`,
  statusByInvoice: (invoice: string) =>
    `/status_by_invoice/${encodeURIComponent(invoice)}`,
  statusByTrackingCode: (code: string) =>
    `/status_by_trackingcode/${encodeURIComponent(code)}`,
  balance: '/get_balance',
} as const;

export interface SteadfastConsignment {
  consignment_id: number;
  invoice: string;
  tracking_code: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export class SteadfastProvider implements CourierProvider {
  readonly id = 'steadfast' as const;
  readonly label = 'Steadfast';

  constructor(private settings: CourierIntegrationDoc) {}

  static async create(settings?: CourierIntegrationDoc) {
    return new SteadfastProvider(settings ?? (await getCourierIntegrationSettings()));
  }

  private get config() {
    return this.settings.steadfast;
  }

  private get baseUrl() {
    return resolveSteadfastBaseUrl(this.config);
  }

  private headers() {
    const { apiKey, secretKey } = this.config ?? {};
    if (!apiKey || !secretKey) {
      throw new CourierApiError(
        'steadfast',
        'Steadfast credentials are incomplete. Add the API key and secret key in Courier → Integrations.',
      );
    }
    return {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request<T>(
    path: string,
    init: { method?: 'GET' | 'POST'; body?: unknown } = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: this.headers(),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);

    // Steadfast answers 200 with a non-200 `status` field on business errors,
    // so the body has to be checked even on a successful HTTP status.
    const businessStatus = payload && typeof payload === 'object' ? payload.status : null;
    const failed =
      !response.ok ||
      (typeof businessStatus === 'number' && businessStatus >= 400);

    if (failed) {
      const message =
        (payload && typeof payload.message === 'string' && payload.message) ||
        `Steadfast request failed (${response.status})`;
      throw new CourierApiError('steadfast', message, {
        statusCode: response.status,
        details: payload,
      });
    }
    return payload as T;
  }

  async testConnection(): Promise<CourierConnectionResult> {
    try {
      const balance = await this.getBalance();
      return {
        ok: true,
        message: `Authenticated. Current balance: ${balance}.`,
        details: { balance, baseUrl: this.baseUrl },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Steadfast connection failed',
      };
    }
  }

  async getBalance(): Promise<number> {
    const payload = await this.request<{ current_balance: number }>(PATH.balance);
    return Number(payload?.current_balance ?? 0);
  }

  async createConsignment(input: CourierDispatchInput): Promise<CourierDispatchResult> {
    const payload = await this.request<{
      consignment: SteadfastConsignment;
    }>(PATH.createOrder, {
      method: 'POST',
      body: {
        invoice: input.merchantOrderId,
        recipient_name: input.recipientName,
        recipient_phone: normalizeBdPhone(input.recipientPhone),
        recipient_address: input.recipientAddress,
        cod_amount: Math.max(0, Math.round(input.amountToCollect)),
        note: buildNote(input),
      },
    });

    const consignment = payload?.consignment;
    if (!consignment?.consignment_id) {
      throw new CourierApiError(
        'steadfast',
        'Steadfast accepted the request but returned no consignment.',
        { details: payload },
      );
    }

    return {
      consignmentId: String(consignment.consignment_id),
      trackingCode: consignment.tracking_code,
      providerStatus: consignment.status,
      status: mapSteadfastStatus(consignment.status) ?? 'pending',
      raw: payload,
    };
  }

  async fetchStatus(ref: {
    consignmentId?: string;
    trackingCode?: string;
    merchantOrderId?: string;
  }): Promise<CourierStatusResult | null> {
    const path = ref.consignmentId
      ? PATH.statusByCid(ref.consignmentId)
      : ref.trackingCode
        ? PATH.statusByTrackingCode(ref.trackingCode)
        : ref.merchantOrderId
          ? PATH.statusByInvoice(ref.merchantOrderId)
          : null;
    if (!path) return null;

    const payload = await this.request<{ delivery_status: string }>(path);
    const providerStatus = payload?.delivery_status;
    if (!providerStatus) return null;

    return {
      providerStatus,
      status: mapSteadfastStatus(providerStatus) ?? 'pending',
      raw: payload,
    };
  }
}

/**
 * Steadfast has one free-text `note` and no item fields, so the parcel
 * description and any handling instruction are folded into it — otherwise the
 * rider reaches the door with nothing but an address.
 */
function buildNote(input: CourierDispatchInput): string {
  return [input.itemDescription, input.specialInstruction]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 500);
}
