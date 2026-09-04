import createLogger from '@/lib/logger';

const logger = createLogger('onesignal-service');
const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

export type LocalizedText = {
  en: string;
  bn: string;
  de: string;
};

export interface OneSignalPushRequest {
  headings: LocalizedText;
  contents: LocalizedText;
  externalUserIds?: string[];
  includedSegments?: string[];
  data?: Record<string, unknown>;
  url?: string;
  webUrl?: string;
  idempotencyKey?: string;
}

export interface OneSignalSendResult {
  skipped: boolean;
  reason?: string;
  status: number | null;
  response?: unknown;
}

const getOneSignalConfig = () => ({
  appId: process.env.ONESIGNAL_APP_ID,
  apiKey: process.env.ONESIGNAL_API_KEY,
});

export function isOneSignalConfigured() {
  const { appId, apiKey } = getOneSignalConfig();
  return Boolean(appId && apiKey);
}

export async function sendOneSignalPush(
  request: OneSignalPushRequest,
): Promise<OneSignalSendResult> {
  const { appId, apiKey } = getOneSignalConfig();

  if (!appId || !apiKey) {
    logger.warn('OneSignal is not configured, skipping notification send');
    return {
      skipped: true,
      reason: 'onesignal_not_configured',
      status: null,
    };
  }

  const externalUserIds = Array.from(new Set(request.externalUserIds || []))
    .filter(Boolean)
    .slice(0, 2000);
  const includedSegments = Array.from(new Set(request.includedSegments || []))
    .filter(Boolean);

  if (externalUserIds.length === 0 && includedSegments.length === 0) {
    return {
      skipped: true,
      reason: 'no_recipients',
      status: null,
    };
  }

  if (externalUserIds.length > 0 && includedSegments.length > 0) {
    return {
      skipped: true,
      reason: 'conflicting_targets',
      status: null,
    };
  }

  const payload: Record<string, unknown> = {
    app_id: appId,
    headings: request.headings,
    contents: request.contents,
    data: request.data || {},
    url: request.url,
    web_url: request.webUrl || request.url,
    ttl: 86400,
    priority: 10,
  };

  if (request.idempotencyKey) {
    payload.idempotency_key = request.idempotencyKey;
  }

  if (externalUserIds.length > 0) {
    payload.include_aliases = { external_id: externalUserIds };
    payload.target_channel = 'push';
  } else if (includedSegments.length > 0) {
    payload.included_segments = includedSegments;
    payload.target_channel = 'push';
  }

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error('OneSignal push failed', {
        status: response.status,
        body,
        recipients: externalUserIds.length || includedSegments.length,
      });
    }

    return {
      skipped: false,
      status: response.status,
      response: body,
    };
  } catch (error) {
    logger.error('OneSignal push request error', error);
    return {
      skipped: true,
      reason: 'request_failed',
      status: null,
    };
  }
}
