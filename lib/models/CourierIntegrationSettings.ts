import mongoose, { Document, Schema } from 'mongoose';

/**
 * Merchant credentials for the courier partners we dispatch consignments to.
 *
 * A singleton, like the other `*Settings` documents. Kept apart from
 * `CourierSettings` (which is pricing/sender data the storefront also reads
 * through `/api/settings/courier`) because everything here is a secret and
 * must never leave an admin-authenticated response unmasked.
 */

export type CourierProviderId = 'pathao' | 'steadfast';

/** Pathao's own `delivery_type` ids. */
export const PATHAO_DELIVERY_TYPE = {
  NORMAL: 48,
  ON_DEMAND: 12,
} as const;

/** Pathao's own `item_type` ids. */
export const PATHAO_ITEM_TYPE = {
  DOCUMENT: 1,
  PARCEL: 2,
} as const;

export const PATHAO_SANDBOX_BASE_URL = 'https://courier-api-sandbox.pathao.com';
export const PATHAO_PRODUCTION_BASE_URL = 'https://api-hermes.pathao.com';
export const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';

export interface IPathaoIntegration {
  enabled: boolean;
  /** Sandbox uses Pathao's public test credentials and a separate base URL. */
  sandbox: boolean;
  /** Overrides the sandbox/production default when set. */
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /** Pathao store the consignments are created against. */
  storeId: string;
  storeName: string;
  defaultDeliveryType: number;
  defaultItemType: number;
  /**
   * Returned in `x-pathao-merchant-webhook-integration-secret` on every
   * webhook response — Pathao rejects the endpoint without it.
   */
  webhookSecret: string;
  /**
   * Cached OAuth token. Cached in the DB rather than in memory because each
   * serverless invocation would otherwise re-issue one, and Pathao rate-limits
   * the token endpoint harder than the order endpoints.
   */
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
}

export interface ISteadfastIntegration {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  /** Bearer token Steadfast sends on delivery-status callbacks. */
  webhookToken: string;
}

export interface ICourierIntegrationSettings extends Document {
  pathao: IPathaoIntegration;
  steadfast: ISteadfastIntegration;
  /** Provider a consignment goes to when the caller does not name one. */
  defaultProvider: CourierProviderId;
  /** Push the consignment to the provider as soon as an order is confirmed. */
  autoDispatchOnConfirm: boolean;
  /**
   * Quote the customer the carrier's own live price at checkout instead of the
   * merchant's flat zone rate.
   *
   * Off by default, and that default is the industry norm rather than timidity:
   * a live quote ties the price the customer agreed to to one carrier's API
   * being up, and to the admin later shipping with *that* carrier. Only Pathao
   * can quote at all — Steadfast has no price endpoint — so with this on, an
   * order quoted at Pathao's rate and then dispatched via Steadfast leaves the
   * merchant carrying the difference. Flat zone rates stay the fallback in
   * every case: carrier down, address unresolved, or Pathao not configured.
   */
  carrierCalculatedRates: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PathaoSchema = new Schema<IPathaoIntegration>(
  {
    enabled: { type: Boolean, default: false },
    sandbox: { type: Boolean, default: true },
    baseUrl: { type: String, default: '' },
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    storeId: { type: String, default: '' },
    storeName: { type: String, default: '' },
    defaultDeliveryType: { type: Number, default: PATHAO_DELIVERY_TYPE.NORMAL },
    defaultItemType: { type: Number, default: PATHAO_ITEM_TYPE.PARCEL },
    webhookSecret: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    tokenExpiresAt: { type: Date, default: null },
  },
  { _id: false },
);

const SteadfastSchema = new Schema<ISteadfastIntegration>(
  {
    enabled: { type: Boolean, default: false },
    baseUrl: { type: String, default: STEADFAST_BASE_URL },
    apiKey: { type: String, default: '' },
    secretKey: { type: String, default: '' },
    webhookToken: { type: String, default: '' },
  },
  { _id: false },
);

const CourierIntegrationSettingsSchema = new Schema<ICourierIntegrationSettings>(
  {
    pathao: { type: PathaoSchema, default: () => ({}) },
    steadfast: { type: SteadfastSchema, default: () => ({}) },
    defaultProvider: {
      type: String,
      enum: ['pathao', 'steadfast'],
      default: 'steadfast',
    },
    autoDispatchOnConfirm: { type: Boolean, default: false },
    carrierCalculatedRates: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.CourierIntegrationSettings ||
  mongoose.model<ICourierIntegrationSettings>(
    'CourierIntegrationSettings',
    CourierIntegrationSettingsSchema,
  );
