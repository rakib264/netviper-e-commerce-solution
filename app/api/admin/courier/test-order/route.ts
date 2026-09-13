import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { validateDispatchInput } from '@/lib/courier/dispatch';
import { getCourierProvider, isCourierProviderId } from '@/lib/courier/providers';
import {
  configuredProviders,
  getCourierIntegrationSettings,
} from '@/lib/courier/settings';
import { CourierApiError, type CourierDispatchInput } from '@/lib/courier/types';
import createLogger from '@/lib/logger';
import CourierSettings from '@/lib/models/CourierSettings';
import {
  PATHAO_DELIVERY_TYPE,
  PATHAO_ITEM_TYPE,
} from '@/lib/models/CourierIntegrationSettings';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A one-off consignment created straight from Courier → Integrations, so an
 * admin can prove the whole chain — credentials, pickup store, routing, the
 * order payload itself — before a real customer order depends on it.
 *
 * Deliberately no local `Courier` record: `Courier.order` is required, and a
 * throwaway test must not invent an order or show up on the consignment board.
 * The consignment it creates at the provider is real, though — the response
 * carries the ids the admin needs to cancel it in the provider's own panel.
 */

const logger = createLogger('courier-test-order');

const ADMIN_ROLES = ['admin', 'manager'];

/** Marks the parcel as a test everywhere the provider will show it to a human. */
const TEST_DESCRIPTION = 'Courier integration test parcel';
const TEST_INSTRUCTION = 'Test consignment created from the admin dashboard.';

/** Unique per dialog opening, so two tests never collide on one reference. */
function generateReference(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TEST-${stamp}-${suffix}`;
}

/**
 * Prefill for the dialog.
 *
 * The recipient defaults to the merchant's own sender details: a test parcel
 * that is actually collected should come back to the merchant, not to an
 * invented address the rider would try to find.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ADMIN_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = request.nextUrl.searchParams.get('provider');
    if (!isCourierProviderId(provider)) {
      return NextResponse.json(
        { error: 'Unknown provider. Expected "pathao" or "steadfast".' },
        { status: 400 },
      );
    }

    await connectDB();
    const [settings, courierSettings] = await Promise.all([
      getCourierIntegrationSettings(),
      CourierSettings.findOne().select('senderInfo').lean(),
    ]);

    const sender = (courierSettings as any)?.senderInfo ?? {};
    const pathao = settings.pathao ?? ({} as (typeof settings)['pathao']);

    return NextResponse.json({
      provider,
      configured: configuredProviders(settings).includes(provider),
      prefill: {
        merchantOrderId: generateReference(),
        recipientName: sender.name ?? '',
        recipientPhone: sender.phone ?? '',
        recipientSecondaryPhone: '',
        recipientAddress: [sender.address, sender.district, sender.division]
          .filter(Boolean)
          .join(', '),
        itemQuantity: 1,
        itemWeight: 0.5,
        itemDescription: TEST_DESCRIPTION,
        specialInstruction: TEST_INSTRUCTION,
        amountToCollect: 0,
        pathaoStoreId: pathao.storeId ?? '',
        pathaoStoreName: pathao.storeName ?? '',
        pathaoDeliveryType: pathao.defaultDeliveryType ?? PATHAO_DELIVERY_TYPE.NORMAL,
        pathaoItemType: pathao.defaultItemType ?? PATHAO_ITEM_TYPE.PARCEL,
      },
    });
  } catch (error) {
    console.error('Courier test order prefill error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare the courier test order' },
      { status: 500 },
    );
  }
}

/** Creates the consignment the dialog was filled in for. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !ADMIN_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider;
    if (!isCourierProviderId(provider)) {
      return NextResponse.json(
        { error: 'Unknown provider. Expected "pathao" or "steadfast".' },
        { status: 400 },
      );
    }

    const settings = await getCourierIntegrationSettings();
    if (!configuredProviders(settings).includes(provider)) {
      return NextResponse.json(
        {
          error: `${provider} is not enabled or its credentials are incomplete. Save them before creating a test order.`,
        },
        { status: 400 },
      );
    }

    const merchantOrderId = String(body.merchantOrderId ?? '').trim() || generateReference();
    const input: CourierDispatchInput = {
      merchantOrderId,
      recipientName: String(body.recipientName ?? '').trim(),
      recipientPhone: String(body.recipientPhone ?? '').trim(),
      recipientSecondaryPhone: optionalText(body.recipientSecondaryPhone),
      recipientAddress: String(body.recipientAddress ?? '').trim(),
      itemQuantity: positiveInt(body.itemQuantity, 1),
      itemWeight: positiveNumber(body.itemWeight, 0.5),
      itemDescription: String(body.itemDescription ?? '').trim() || TEST_DESCRIPTION,
      specialInstruction: optionalText(body.specialInstruction),
      amountToCollect: Math.max(0, Math.round(Number(body.amountToCollect) || 0)),
    };

    // Pathao-only overrides: sent when the admin picked something other than
    // the stored default in the dialog, omitted entirely otherwise so the
    // adapter falls back to the saved configuration.
    if (provider === 'pathao') {
      input.pathaoStoreId = optionalText(body.pathaoStoreId);
      input.pathaoDeliveryType = optionalNumber(body.pathaoDeliveryType);
      input.pathaoItemType = optionalNumber(body.pathaoItemType);
      input.pathaoCityId = optionalNumber(body.pathaoCityId);
      input.pathaoZoneId = optionalNumber(body.pathaoZoneId);
      input.pathaoAreaId = optionalNumber(body.pathaoAreaId);
    }

    const invalid = validateDispatchInput(input);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const adapter = await getCourierProvider(provider, settings);
    const result = await adapter.createConsignment(input);

    logger.info('Courier test consignment created', {
      provider,
      merchantOrderId,
      consignmentId: result.consignmentId,
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'DISPATCH',
      resource: 'Courier',
      metadata: {
        test: true,
        provider,
        merchantOrderId,
        consignmentId: result.consignmentId,
        trackingCode: result.trackingCode,
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      provider,
      merchantOrderId,
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode ?? null,
      providerStatus: result.providerStatus ?? null,
      deliveryFee: result.deliveryFee ?? null,
      status: result.status,
      raw: result.raw,
    });
  } catch (error) {
    if (error instanceof CourierApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode ?? 400 },
      );
    }
    console.error('Courier test order error:', error);
    return NextResponse.json(
      { error: 'Failed to create the courier test order' },
      { status: 500 },
    );
  }
}

function optionalText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
