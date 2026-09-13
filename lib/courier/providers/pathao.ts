import { mapPathaoStatus } from '@/lib/courier/status-map';
import {
  getCourierIntegrationSettings,
  resolvePathaoBaseUrl,
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
import createLogger from '@/lib/logger';
import {
  PATHAO_DELIVERY_TYPE,
  PATHAO_ITEM_TYPE,
} from '@/lib/models/CourierIntegrationSettings';

/**
 * Pathao Courier Merchant API (`/aladdin/api/v1/*`).
 *
 * Auth is OAuth2 password grant. The token lasts days, so it is cached on the
 * settings document rather than re-issued per invocation — see the note on
 * `IPathaoIntegration.accessToken`.
 */

const logger = createLogger('courier-pathao');

/** Re-issue this long before the stated expiry, to survive clock skew. */
const TOKEN_SKEW_MS = 5 * 60 * 1000;

const PATH = {
  issueToken: '/aladdin/api/v1/issue-token',
  orders: '/aladdin/api/v1/orders',
  bulkOrders: '/aladdin/api/v1/orders/bulk',
  orderInfo: (consignmentId: string) =>
    `/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
  stores: '/aladdin/api/v1/stores',
  pricePlan: '/aladdin/api/v1/merchant/price-plan',
  cities: '/aladdin/api/v1/city-list',
  zones: (cityId: number) => `/aladdin/api/v1/cities/${cityId}/zone-list`,
  areas: (zoneId: number) => `/aladdin/api/v1/zones/${zoneId}/area-list`,
} as const;

export interface PathaoCity {
  city_id: number;
  city_name: string;
}
export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}
export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}
export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: 0 | 1;
  city_id: number;
  zone_id: number;
  hub_id: number;
  is_default_store: boolean;
  is_default_return_store: boolean;
}
export interface PathaoPriceQuote {
  price: number;
  discount: number;
  promo_discount: number;
  plan_id: number;
  cod_enabled: 0 | 1;
  cod_percentage: number;
  additional_charge: number;
  final_price: number;
}

interface PathaoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

/** Pathao returns validation problems under `errors` keyed by field. */
function describeError(payload: any, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const bag = payload.errors ?? payload.validation;
  if (bag && typeof bag === 'object') {
    const flattened = Object.entries(bag)
      .map(([field, messages]) =>
        `${field}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`,
      )
      .join('; ');
    if (flattened) return flattened;
  }
  return typeof payload.message === 'string' ? payload.message : fallback;
}

export class PathaoProvider implements CourierProvider {
  readonly id = 'pathao' as const;
  readonly label = 'Pathao';

  constructor(private settings: CourierIntegrationDoc) {}

  static async create(settings?: CourierIntegrationDoc) {
    return new PathaoProvider(settings ?? (await getCourierIntegrationSettings()));
  }

  private get config() {
    return this.settings.pathao;
  }

  private get baseUrl() {
    return resolvePathaoBaseUrl(this.config);
  }

  private assertConfigured() {
    const { clientId, clientSecret, username, password } = this.config ?? {};
    if (!clientId || !clientSecret || !username || !password) {
      throw new CourierApiError(
        'pathao',
        'Pathao credentials are incomplete. Add the client id, client secret, username and password in Courier → Integrations.',
      );
    }
  }

  /**
   * A valid bearer token, minting one if the cached token is missing or close
   * to expiry. The refresh grant is tried first; a rejected refresh falls back
   * to the password grant rather than failing the dispatch.
   */
  private async getAccessToken(forceRefresh = false): Promise<string> {
    this.assertConfigured();
    const cfg = this.config;
    const expiresAt = cfg.tokenExpiresAt ? new Date(cfg.tokenExpiresAt).getTime() : 0;

    if (!forceRefresh && cfg.accessToken && expiresAt - TOKEN_SKEW_MS > Date.now()) {
      return cfg.accessToken;
    }

    let token: PathaoTokenResponse | null = null;
    if (cfg.refreshToken) {
      token = await this.issueToken({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: cfg.refreshToken,
      }).catch((error) => {
        logger.warn('Pathao refresh token rejected, falling back to password grant', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      });
    }

    if (!token) {
      token = await this.issueToken({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'password',
        username: cfg.username,
        password: cfg.password,
      });
    }

    cfg.accessToken = token.access_token;
    cfg.refreshToken = token.refresh_token ?? '';
    cfg.tokenExpiresAt = new Date(Date.now() + (token.expires_in ?? 0) * 1000);
    this.settings.markModified('pathao');
    await this.settings.save();

    return cfg.accessToken;
  }

  private async issueToken(body: Record<string, string>): Promise<PathaoTokenResponse> {
    const response = await fetch(`${this.baseUrl}${PATH.issueToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) {
      throw new CourierApiError(
        'pathao',
        describeError(payload, 'Pathao rejected the credentials'),
        { statusCode: response.status, details: payload },
      );
    }
    return payload as PathaoTokenResponse;
  }

  /**
   * One authenticated call. A 401 is retried exactly once with a freshly
   * issued token, which covers a token revoked on Pathao's side before its
   * stated expiry.
   */
  private async request<T>(
    path: string,
    init: { method?: 'GET' | 'POST'; body?: unknown } = {},
    retryOn401 = true,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });

    if (response.status === 401 && retryOn401) {
      await this.getAccessToken(true);
      return this.request<T>(path, init, false);
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new CourierApiError(
        'pathao',
        describeError(payload, `Pathao request failed (${response.status})`),
        { statusCode: response.status, details: payload },
      );
    }
    return payload as T;
  }

  async testConnection(): Promise<CourierConnectionResult> {
    try {
      await this.getAccessToken(true);
      const stores = await this.listStores();
      return {
        ok: true,
        message: `Authenticated. ${stores.length} store${stores.length === 1 ? '' : 's'} available.`,
        details: { stores: stores.length, baseUrl: this.baseUrl },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Pathao connection failed',
      };
    }
  }

  async listStores(): Promise<PathaoStore[]> {
    const payload = await this.request<{ data: { data: PathaoStore[] } }>(PATH.stores);
    return payload?.data?.data ?? [];
  }

  async createStore(input: {
    name: string;
    contact_name: string;
    contact_number: string;
    secondary_contact?: string;
    address: string;
    city_id: number;
    zone_id: number;
    area_id: number;
  }): Promise<{ store_name: string }> {
    const payload = await this.request<{ data: { store_name: string } }>(PATH.stores, {
      method: 'POST',
      body: input,
    });
    return payload.data;
  }

  async listCities(): Promise<PathaoCity[]> {
    const payload = await this.request<{ data: { data: PathaoCity[] } }>(PATH.cities);
    return payload?.data?.data ?? [];
  }

  async listZones(cityId: number): Promise<PathaoZone[]> {
    const payload = await this.request<{ data: { data: PathaoZone[] } }>(
      PATH.zones(cityId),
    );
    return payload?.data?.data ?? [];
  }

  async listAreas(zoneId: number): Promise<PathaoArea[]> {
    const payload = await this.request<{ data: { data: PathaoArea[] } }>(
      PATH.areas(zoneId),
    );
    return payload?.data?.data ?? [];
  }

  async calculatePrice(input: {
    itemType?: number;
    deliveryType?: number;
    itemWeight: number;
    recipientCity: number;
    recipientZone: number;
    storeId?: string;
  }): Promise<PathaoPriceQuote> {
    const storeId = input.storeId || this.config.storeId;
    if (!storeId) {
      throw new CourierApiError('pathao', 'No Pathao store selected for the price quote.');
    }
    const payload = await this.request<{ data: PathaoPriceQuote }>(PATH.pricePlan, {
      method: 'POST',
      body: {
        store_id: Number(storeId),
        item_type: input.itemType ?? this.config.defaultItemType ?? PATHAO_ITEM_TYPE.PARCEL,
        delivery_type:
          input.deliveryType ?? this.config.defaultDeliveryType ?? PATHAO_DELIVERY_TYPE.NORMAL,
        item_weight: clampWeight(input.itemWeight),
        recipient_city: input.recipientCity,
        recipient_zone: input.recipientZone,
      },
    });
    return payload.data;
  }

  async createConsignment(input: CourierDispatchInput): Promise<CourierDispatchResult> {
    const storeId = input.pathaoStoreId || this.config.storeId;
    if (!storeId) {
      throw new CourierApiError(
        'pathao',
        'No Pathao store selected. Pick one in Courier → Integrations before dispatching.',
      );
    }

    const body: Record<string, unknown> = {
      store_id: Number(storeId),
      merchant_order_id: input.merchantOrderId,
      recipient_name: input.recipientName,
      recipient_phone: normalizeBdPhone(input.recipientPhone),
      recipient_address: input.recipientAddress,
      delivery_type:
        input.pathaoDeliveryType ??
        this.config.defaultDeliveryType ??
        PATHAO_DELIVERY_TYPE.NORMAL,
      item_type:
        input.pathaoItemType ?? this.config.defaultItemType ?? PATHAO_ITEM_TYPE.PARCEL,
      item_quantity: Math.max(1, Math.round(input.itemQuantity)),
      item_weight: clampWeight(input.itemWeight),
      amount_to_collect: Math.max(0, Math.round(input.amountToCollect)),
    };

    if (input.recipientSecondaryPhone) {
      body.recipient_secondary_phone = normalizeBdPhone(input.recipientSecondaryPhone);
    }
    if (input.itemDescription) body.item_description = input.itemDescription;
    if (input.specialInstruction) body.special_instruction = input.specialInstruction;
    // Omitted entirely when unresolved: Pathao then auto-detects the routing
    // from the address, which is better than sending a wrong id.
    if (input.pathaoCityId) body.recipient_city = input.pathaoCityId;
    if (input.pathaoZoneId) body.recipient_zone = input.pathaoZoneId;
    if (input.pathaoAreaId) body.recipient_area = input.pathaoAreaId;

    const payload = await this.request<{
      data: {
        consignment_id: string;
        merchant_order_id?: string;
        order_status: string;
        delivery_fee: number;
      };
    }>(PATH.orders, { method: 'POST', body });

    const data = payload.data;
    return {
      consignmentId: data.consignment_id,
      providerStatus: data.order_status,
      deliveryFee: data.delivery_fee,
      status: mapPathaoStatus(data.order_status) ?? 'pending',
      raw: payload,
    };
  }

  async fetchStatus(ref: {
    consignmentId?: string;
  }): Promise<CourierStatusResult | null> {
    if (!ref.consignmentId) return null;
    const payload = await this.request<{
      data: { order_status: string; order_status_slug: string };
    }>(PATH.orderInfo(ref.consignmentId));

    const data = payload?.data;
    if (!data) return null;
    const providerStatus = data.order_status_slug || data.order_status;
    return {
      providerStatus,
      status: mapPathaoStatus(providerStatus) ?? 'pending',
      raw: payload,
    };
  }
}

/** Pathao accepts 0.5–10 kg and rejects anything outside it outright. */
function clampWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0.5;
  return Math.min(10, Math.max(0.5, Math.round(weight * 100) / 100));
}

/**
 * Pathao validates `recipient_phone` as exactly 11 digits (01XXXXXXXXX).
 * Numbers stored with a `+880`/`880` prefix or separators are reduced to that.
 */
export function normalizeBdPhone(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('880')) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith('88')) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return digits;
}
