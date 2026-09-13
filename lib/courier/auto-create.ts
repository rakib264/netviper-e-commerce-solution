import 'server-only';

import { configuredProviders, getCourierIntegrationSettings } from '@/lib/courier/settings';
import { toKilograms } from '@/lib/courier/rates';
import type { CourierProviderId } from '@/lib/courier/types';
import createLogger from '@/lib/logger';
import AuditLog from '@/lib/models/AuditLog';
import Courier from '@/lib/models/Courier';
import CourierSettings from '@/lib/models/CourierSettings';
import connectDB from '@/lib/mongodb';

/**
 * Creating the courier record that an order confirmation implies.
 *
 * This was ~166 lines duplicated verbatim between
 * `PUT /api/admin/orders/[id]/status` and `PATCH /api/admin/orders/[id]` —
 * identical but for one note string, so any fix had to be made twice and the
 * two copies had already drifted. One copy now, called from both.
 */

const logger = createLogger('courier-auto-create');

/**
 * Which partner an auto-created record is stamped with.
 *
 * Two settings documents claimed this. `CourierIntegrationSettings.defaultProvider`
 * is what the admin picks in Courier → Settings and what the dispatcher reads;
 * `CourierSettings.defaultCourierPartners[0]` is the older field, and it was the
 * one the auto-create block used. Since `dispatchCourier` prefers the courier's
 * own `courierPartner` over the configured default, the legacy value won every
 * time — an admin who enabled Pathao and selected it still got every order
 * stamped `steadfast`.
 *
 * The new field wins, but only when that provider is actually usable. Falling
 * back to the legacy list rather than to a constant preserves the one thing it
 * expresses that the new field cannot: an off-platform partner such as `redx`
 * or `paperfly`, which has no adapter and is tracked by hand.
 */
export function resolveDefaultCourierPartner(
  integrationSettings: { defaultProvider?: CourierProviderId } & Record<string, any>,
  legacyPartners: string[] | undefined,
): string {
  const preferred = integrationSettings.defaultProvider;
  if (preferred && configuredProviders(integrationSettings as any).includes(preferred)) {
    return preferred;
  }
  return legacyPartners?.[0] || preferred || 'steadfast';
}

export interface EnsureCourierResult {
  created: boolean;
  courierId?: string;
  /** Set when creation was attempted and failed; never thrown. */
  error?: string;
}

/**
 * Creates the courier record for a confirmed order, once.
 *
 * Idempotent on the order: an existing record short-circuits, and a duplicate
 * key from the unique index short-circuits too, so two confirmations racing
 * each other produce one record rather than two.
 *
 * Never throws. A courier problem must not roll back the order status change
 * that triggered it — the same contract `autoDispatchOrderCourier` keeps.
 */
export async function ensureCourierForOrder(
  order: any,
  actorUserId: string,
  options: { source?: string } = {},
): Promise<EnsureCourierResult> {
  try {
    await connectDB();

    const existing = await Courier.findOne({ order: order._id }).select('_id courierId');
    if (existing) return { created: false, courierId: existing.courierId };

    const [integrationSettings, legacySettings] = await Promise.all([
      getCourierIntegrationSettings(),
      CourierSettings.findOne(),
    ]);

    const settings = legacySettings ?? (await CourierSettings.create({}));

    const totalWeight =
      order.items?.reduce(
        (sum: number, item: any) => sum + toKilograms(item.product?.weight) * item.quantity,
        0,
      ) || 0.5;

    const parcelDescription =
      order.items
        ?.map((item: any) => `${item.name} (Qty: ${item.quantity})`)
        .join(', ') || 'Order items';

    const isCOD = order.paymentMethod === 'cod';
    /*
     * The delivery charge on the record is what the order actually charged, not
     * a second derivation from the rate table.
     *
     * It used to re-derive one from `deliveryCharges.{express,sameDay,...}`
     * against a `deliveryType` that checkout never emits — so the record
     * routinely disagreed with the customer's invoice for the same parcel. The
     * order is the source of truth for what was charged; what the carrier
     * actually bills lands separately in `providerDeliveryFee` at dispatch, and
     * the gap between the two is the merchant's real delivery margin.
     */
    const deliveryCharge = Number(order.shippingCost) || 0;
    // Unchanged from the block this replaces: a percentage of the order value
    // with a floor, both taken from the merchant's own COD settings.
    const codCharge = isCOD
      ? Math.max(10, ((Number(order.total) || 0) * (settings.codChargeRate ?? 1)) / 100)
      : 0;

    const courierData = {
      courierId: `CR${Date.now().toString().slice(-8)}`,
      order: order._id,
      sender: {
        name: settings.senderInfo?.name,
        phone: settings.senderInfo?.phone,
        address: settings.senderInfo?.address,
        division: settings.senderInfo?.division,
        district: settings.senderInfo?.district,
      },
      receiver: {
        name:
          order.shippingAddress?.name ||
          `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() ||
          'Customer',
        phone: order.shippingAddress?.phone || order.customer?.phone || '',
        address: order.shippingAddress?.street || '',
        city: order.shippingAddress?.city || '',
        district: order.shippingAddress?.district || '',
        division: order.shippingAddress?.division || '',
      },
      parcel: {
        type: 'regular' as const,
        quantity:
          order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 1,
        weight: Math.max(totalWeight, 0.5),
        value: order.total || 0,
        description: parcelDescription,
      },
      isCOD,
      codAmount: isCOD ? order.total : 0,
      isFragile: false,
      charges: {
        deliveryCharge,
        codCharge,
        totalCharge: deliveryCharge + codCharge,
      },
      status: 'pending' as const,
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          updatedBy: actorUserId,
          notes: 'Auto-generated courier record',
        },
      ],
      courierPartner: resolveDefaultCourierPartner(
        integrationSettings,
        settings.defaultCourierPartners,
      ),
      merchantOrderId: order.orderNumber,
      notes: `Auto-generated from order ${order.orderNumber}`,
    };

    // Both providers reject a consignment missing either of these, and a record
    // that cannot be dispatched is worse than a clear failure at creation.
    if (!courierData.receiver.name || !courierData.receiver.phone) {
      return { created: false, error: 'The order has no recipient name or phone.' };
    }
    if (!courierData.sender.name || !courierData.sender.phone) {
      return {
        created: false,
        error: 'No pickup address is configured. Set it in Courier → Settings.',
      };
    }

    const created = await Courier.create(courierData);

    await AuditLog.create({
      user: actorUserId,
      action: 'CREATE',
      resource: 'Courier',
      resourceId: courierData.courierId,
      metadata: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        autoGenerated: true,
        source: options.source ?? 'order-confirmation',
        courierPartner: courierData.courierPartner,
      },
    });

    return { created: true, courierId: created.courierId };
  } catch (error) {
    // A concurrent confirmation won the race. Its record is the one record.
    if ((error as any)?.code === 11000) {
      return { created: false };
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Auto-creating the courier record failed', {
      orderId: String(order?._id ?? ''),
      error: message,
    });
    return { created: false, error: message };
  }
}
