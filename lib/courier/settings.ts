import CourierIntegrationSettings, {
  PATHAO_DELIVERY_TYPE,
  PATHAO_ITEM_TYPE,
  PATHAO_PRODUCTION_BASE_URL,
  PATHAO_SANDBOX_BASE_URL,
  STEADFAST_BASE_URL,
  type CourierProviderId,
  type ICourierIntegrationSettings,
} from '@/lib/models/CourierIntegrationSettings';
import connectDB from '@/lib/mongodb';

/**
 * Read/write access to the merchant credentials, plus the masking rules that
 * keep them out of API responses.
 */

/** Fields never echoed back to the browser in clear text. */
const PATHAO_SECRETS = ['clientSecret', 'password'] as const;
const STEADFAST_SECRETS = ['apiKey', 'secretKey'] as const;

export type CourierIntegrationDoc = ICourierIntegrationSettings;

export async function getCourierIntegrationSettings(): Promise<CourierIntegrationDoc> {
  await connectDB();
  const existing = await CourierIntegrationSettings.findOne();
  if (existing) return existing;
  return CourierIntegrationSettings.create({});
}

/** Base URL a Pathao call should target, honouring an explicit override. */
export function resolvePathaoBaseUrl(pathao: {
  baseUrl?: string;
  sandbox?: boolean;
}): string {
  const override = pathao.baseUrl?.trim();
  if (override) return override.replace(/\/+$/, '');
  return pathao.sandbox ? PATHAO_SANDBOX_BASE_URL : PATHAO_PRODUCTION_BASE_URL;
}

export function resolveSteadfastBaseUrl(steadfast: { baseUrl?: string }): string {
  const value = steadfast.baseUrl?.trim() || STEADFAST_BASE_URL;
  return value.replace(/\/+$/, '');
}

/** Last four characters, so an admin can tell which key is stored. */
function maskSecret(value: string | undefined): string {
  if (!value) return '';
  const tail = value.slice(-4);
  return `••••••••${tail}`;
}

/**
 * The admin-facing view: secrets are replaced by a hint plus a `has*` flag,
 * and the cached OAuth token is dropped entirely — nothing in the UI needs it
 * and it is as sensitive as the password that minted it.
 */
export function toAdminIntegrationPayload(settings: CourierIntegrationDoc) {
  const pathao = settings.pathao ?? ({} as CourierIntegrationDoc['pathao']);
  const steadfast = settings.steadfast ?? ({} as CourierIntegrationDoc['steadfast']);

  return {
    defaultProvider: settings.defaultProvider ?? 'steadfast',
    autoDispatchOnConfirm: Boolean(settings.autoDispatchOnConfirm),
    carrierCalculatedRates: Boolean(settings.carrierCalculatedRates),
    pathao: {
      enabled: Boolean(pathao.enabled),
      sandbox: pathao.sandbox !== false,
      baseUrl: pathao.baseUrl ?? '',
      resolvedBaseUrl: resolvePathaoBaseUrl(pathao),
      clientId: pathao.clientId ?? '',
      username: pathao.username ?? '',
      storeId: pathao.storeId ?? '',
      storeName: pathao.storeName ?? '',
      defaultDeliveryType: pathao.defaultDeliveryType ?? PATHAO_DELIVERY_TYPE.NORMAL,
      defaultItemType: pathao.defaultItemType ?? PATHAO_ITEM_TYPE.PARCEL,
      webhookSecret: pathao.webhookSecret ?? '',
      clientSecretHint: maskSecret(pathao.clientSecret),
      passwordHint: maskSecret(pathao.password),
      hasClientSecret: Boolean(pathao.clientSecret),
      hasPassword: Boolean(pathao.password),
      tokenExpiresAt: pathao.tokenExpiresAt ?? null,
    },
    steadfast: {
      enabled: Boolean(steadfast.enabled),
      baseUrl: steadfast.baseUrl ?? STEADFAST_BASE_URL,
      resolvedBaseUrl: resolveSteadfastBaseUrl(steadfast),
      webhookToken: steadfast.webhookToken ?? '',
      apiKeyHint: maskSecret(steadfast.apiKey),
      secretKeyHint: maskSecret(steadfast.secretKey),
      hasApiKey: Boolean(steadfast.apiKey),
      hasSecretKey: Boolean(steadfast.secretKey),
    },
  };
}

export type AdminIntegrationPayload = ReturnType<typeof toAdminIntegrationPayload>;

/**
 * Applies an admin edit.
 *
 * A secret arriving blank means "unchanged" — the form never receives the real
 * value, so it cannot send it back, and treating blank as a deletion would
 * wipe the credentials on every unrelated save. Clearing one is done through
 * the explicit `clear*` flags the form sends when the admin empties a field.
 */
export function applyIntegrationUpdate(
  settings: CourierIntegrationDoc,
  body: Record<string, any>,
): void {
  if (body.defaultProvider === 'pathao' || body.defaultProvider === 'steadfast') {
    settings.defaultProvider = body.defaultProvider;
  }
  if (typeof body.autoDispatchOnConfirm === 'boolean') {
    settings.autoDispatchOnConfirm = body.autoDispatchOnConfirm;
  }
  if (typeof body.carrierCalculatedRates === 'boolean') {
    settings.carrierCalculatedRates = body.carrierCalculatedRates;
  }

  const pathao = body.pathao ?? {};
  if (Object.keys(pathao).length) {
    const target = settings.pathao;
    // Compared by value, not by presence: the form posts every field on every
    // save, so a presence check would discard the cached token each time an
    // admin toggled something unrelated.
    const before = {
      clientId: target.clientId,
      username: target.username,
      clientSecret: target.clientSecret,
      password: target.password,
      sandbox: target.sandbox,
      baseUrl: target.baseUrl,
    };

    if (typeof pathao.enabled === 'boolean') target.enabled = pathao.enabled;
    if (typeof pathao.sandbox === 'boolean') target.sandbox = pathao.sandbox;
    if (typeof pathao.baseUrl === 'string') target.baseUrl = pathao.baseUrl.trim();
    if (typeof pathao.clientId === 'string') target.clientId = pathao.clientId.trim();
    if (typeof pathao.username === 'string') target.username = pathao.username.trim();
    if (typeof pathao.storeId === 'string') target.storeId = pathao.storeId.trim();
    if (typeof pathao.storeName === 'string') target.storeName = pathao.storeName.trim();
    if (typeof pathao.webhookSecret === 'string') {
      target.webhookSecret = pathao.webhookSecret.trim();
    }
    if (Number.isFinite(Number(pathao.defaultDeliveryType))) {
      target.defaultDeliveryType = Number(pathao.defaultDeliveryType);
    }
    if (Number.isFinite(Number(pathao.defaultItemType))) {
      target.defaultItemType = Number(pathao.defaultItemType);
    }
    for (const key of PATHAO_SECRETS) {
      if (typeof pathao[key] === 'string' && pathao[key].trim()) {
        target[key] = pathao[key].trim();
      } else if (pathao[`clear${key[0].toUpperCase()}${key.slice(1)}`] === true) {
        target[key] = '';
      }
    }

    // Any credential change invalidates the cached token — the next call must
    // re-issue one rather than keep using a token minted from old secrets.
    const credentialsChanged =
      before.clientId !== target.clientId ||
      before.username !== target.username ||
      before.clientSecret !== target.clientSecret ||
      before.password !== target.password ||
      before.sandbox !== target.sandbox ||
      before.baseUrl !== target.baseUrl;

    if (credentialsChanged) {
      target.accessToken = '';
      target.refreshToken = '';
      target.tokenExpiresAt = null;
    }
  }

  const steadfast = body.steadfast ?? {};
  if (Object.keys(steadfast).length) {
    const target = settings.steadfast;
    if (typeof steadfast.enabled === 'boolean') target.enabled = steadfast.enabled;
    if (typeof steadfast.baseUrl === 'string') {
      target.baseUrl = steadfast.baseUrl.trim() || STEADFAST_BASE_URL;
    }
    if (typeof steadfast.webhookToken === 'string') {
      target.webhookToken = steadfast.webhookToken.trim();
    }
    for (const key of STEADFAST_SECRETS) {
      if (typeof steadfast[key] === 'string' && steadfast[key].trim()) {
        target[key] = steadfast[key].trim();
      } else if (steadfast[`clear${key[0].toUpperCase()}${key.slice(1)}`] === true) {
        target[key] = '';
      }
    }
  }
}

/** Providers that are both switched on and hold the credentials they need. */
export function configuredProviders(
  settings: CourierIntegrationDoc,
): CourierProviderId[] {
  const ids: CourierProviderId[] = [];
  const { pathao, steadfast } = settings;
  if (
    pathao?.enabled &&
    pathao.clientId &&
    pathao.clientSecret &&
    pathao.username &&
    pathao.password
  ) {
    ids.push('pathao');
  }
  if (steadfast?.enabled && steadfast.apiKey && steadfast.secretKey) {
    ids.push('steadfast');
  }
  return ids;
}
