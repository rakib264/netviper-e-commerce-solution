import { applyProviderStatus } from '@/lib/courier/dispatch';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { mapSteadfastStatus } from '@/lib/courier/status-map';
import createLogger from '@/lib/logger';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Steadfast delivery-status callbacks.
 *
 * Steadfast authenticates with a bearer token the merchant chooses and
 * configures on their portal alongside the callback URL.
 */

const logger = createLogger('courier-webhook-steadfast');

/** Constant-time compare, so the token cannot be recovered byte by byte. */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const settings = await getCourierIntegrationSettings();
    if (!settings.steadfast?.enabled) {
      return NextResponse.json({ error: 'Steadfast integration is disabled' }, { status: 403 });
    }

    const expected = settings.steadfast.webhookToken ?? '';
    if (!expected) {
      // Without a configured token any caller could move orders to delivered.
      return NextResponse.json(
        { error: 'No webhook token configured for Steadfast' },
        { status: 403 },
      );
    }

    const provided = (request.headers.get('authorization') ?? '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    if (!provided || !tokenMatches(provided, expected)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
    }

    await connectDB();

    const consignmentId = payload.consignment_id ? String(payload.consignment_id) : '';
    const invoice = payload.invoice ? String(payload.invoice) : '';

    const courier = await Courier.findOne({
      courierPartner: 'steadfast',
      ...(consignmentId
        ? { consignmentId }
        : invoice
          ? { merchantOrderId: invoice }
          : { _id: null }),
    });

    if (!courier) {
      logger.warn('Steadfast webhook for an unknown consignment', {
        consignmentId,
        invoice,
      });
      // Acknowledged rather than 404'd: Steadfast retries on failure and the
      // consignment will not become ours in the meantime.
      return NextResponse.json({ received: true, matched: false });
    }

    const providerStatus = String(payload.status ?? payload.delivery_status ?? '');
    if (!providerStatus) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    await applyProviderStatus(
      courier,
      providerStatus,
      mapSteadfastStatus(providerStatus),
      'webhook',
    );

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    logger.error('Steadfast webhook processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
