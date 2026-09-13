import { auth } from '@/lib/auth';
import {
  applyIntegrationUpdate,
  configuredProviders,
  getCourierIntegrationSettings,
  toAdminIntegrationPayload,
} from '@/lib/courier/settings';
import { createAuditLog, getClientIP } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Merchant credentials for Pathao and Steadfast.
 *
 * Read is open to the roles that operate the courier desk, because the payload
 * is masked; writing credentials is restricted to `admin`.
 */

export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getCourierIntegrationSettings();
    return NextResponse.json({
      settings: toAdminIntegrationPayload(settings),
      configuredProviders: configuredProviders(settings),
    });
  } catch (error) {
    console.error('Courier integration settings error:', error);
    return NextResponse.json(
      { error: 'Failed to load courier integration settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settings = await getCourierIntegrationSettings();

    const before = toAdminIntegrationPayload(settings);
    applyIntegrationUpdate(settings, body);
    await settings.save();
    const after = toAdminIntegrationPayload(settings);

    // Secret values are never logged — only the fact that one changed, which
    // is what an auditor actually needs.
    const changes = [
      ...diff('defaultProvider', before.defaultProvider, after.defaultProvider),
      ...diff(
        'autoDispatchOnConfirm',
        before.autoDispatchOnConfirm,
        after.autoDispatchOnConfirm,
      ),
      ...diff('pathao.enabled', before.pathao.enabled, after.pathao.enabled),
      ...diff('pathao.sandbox', before.pathao.sandbox, after.pathao.sandbox),
      ...diff('pathao.storeId', before.pathao.storeId, after.pathao.storeId),
      ...diff('pathao.clientId', before.pathao.clientId, after.pathao.clientId),
      ...diff('pathao.username', before.pathao.username, after.pathao.username),
      ...diff(
        'pathao.clientSecret',
        before.pathao.clientSecretHint,
        after.pathao.clientSecretHint,
      ),
      ...diff('pathao.password', before.pathao.passwordHint, after.pathao.passwordHint),
      ...diff('steadfast.enabled', before.steadfast.enabled, after.steadfast.enabled),
      ...diff('steadfast.baseUrl', before.steadfast.baseUrl, after.steadfast.baseUrl),
      ...diff('steadfast.apiKey', before.steadfast.apiKeyHint, after.steadfast.apiKeyHint),
      ...diff(
        'steadfast.secretKey',
        before.steadfast.secretKeyHint,
        after.steadfast.secretKeyHint,
      ),
    ];

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'CourierIntegrationSettings',
      resourceId: String(settings._id),
      changes,
      metadata: { settingsType: 'courier-integrations' },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      settings: after,
      configuredProviders: configuredProviders(settings),
    });
  } catch (error) {
    console.error('Update courier integration settings error:', error);
    return NextResponse.json(
      { error: 'Failed to save courier integration settings' },
      { status: 500 },
    );
  }
}

function diff(field: string, oldValue: unknown, newValue: unknown) {
  return oldValue === newValue ? [] : [{ field, oldValue, newValue }];
}
