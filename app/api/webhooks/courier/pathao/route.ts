import { applyProviderStatus } from '@/lib/courier/dispatch';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { mapPathaoStatus } from '@/lib/courier/status-map';
import createLogger from '@/lib/logger';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Pathao order webhooks.
 *
 * Pathao does not sign its requests. What it does require is that every
 * response carry the merchant's webhook secret in
 * `X-Pathao-Merchant-Webhook-Integration-Secret` — that header is the whole
 * handshake, and Pathao disables an endpoint that omits it. So the secret is
 * both how we authenticate ourselves *to* Pathao and, checked against the
 * inbound copy when Pathao sends one, the only authentication we get from it.
 */

const logger = createLogger('courier-webhook-pathao');
const SECRET_HEADER = 'x-pathao-merchant-webhook-integration-secret';

export async function POST(request: NextRequest) {
  const settings = await getCourierIntegrationSettings().catch(() => null);
  const secret = settings?.pathao?.webhookSecret ?? '';
  const respond = (body: unknown, status: number) =>
    NextResponse.json(body, { status, headers: { [SECRET_HEADER]: secret } });

  if (!settings?.pathao?.enabled) {
    return respond({ error: 'Pathao integration is disabled' }, 403);
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: 'Malformed JSON' }, 400);
  }

  const event = String(payload?.event ?? '');
  if (!event) return respond({ error: 'Missing event' }, 400);

  // The handshake event carries nothing to process and expects a 202.
  if (event === 'webhook_integration') {
    return respond({ received: true }, 202);
  }

  // Store events change no consignment; acknowledge and move on.
  if (event.startsWith('store.')) {
    return respond({ received: true }, 202);
  }

  try {
    await connectDB();

    const consignmentId = payload.consignment_id ? String(payload.consignment_id) : '';
    const merchantOrderId = payload.merchant_order_id
      ? String(payload.merchant_order_id)
      : '';

    const courier = await Courier.findOne({
      courierPartner: 'pathao',
      ...(consignmentId
        ? { consignmentId }
        : merchantOrderId
          ? { merchantOrderId }
          : { _id: null }),
    });

    if (!courier) {
      // Acknowledge anyway: retrying will not make an unknown consignment
      // known, and a 4xx here makes Pathao disable the endpoint.
      logger.warn('Pathao webhook for an unknown consignment', {
        event,
        consignmentId,
        merchantOrderId,
      });
      return respond({ received: true, matched: false }, 202);
    }

    await applyProviderStatus(courier, event, mapPathaoStatus(event), 'webhook');

    if (typeof payload.delivery_fee === 'number' && !courier.providerDeliveryFee) {
      courier.providerDeliveryFee = payload.delivery_fee;
      await courier.save();
    }

    return respond({ received: true, matched: true }, 202);
  } catch (error) {
    logger.error('Pathao webhook processing failed', {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
    return respond({ error: 'Webhook processing failed' }, 500);
  }
}
