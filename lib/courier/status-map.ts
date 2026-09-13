import type { CourierStatus } from './types';

/**
 * Provider status vocabularies → our six-state `Courier.status`.
 *
 * Both providers keep inventing labels (Pathao alone emits 20+ webhook
 * events), so an unknown value must never crash a webhook or a sync: it
 * leaves the local status untouched and is stored verbatim in
 * `providerStatus` instead.
 */

/** Steadfast `delivery_status` values, from their API documentation. */
const STEADFAST_STATUS: Record<string, CourierStatus> = {
  pending: 'pending',
  in_review: 'pending',
  hold: 'pending',
  delivered_approval_pending: 'in_transit',
  partial_delivered_approval_pending: 'in_transit',
  cancelled_approval_pending: 'in_transit',
  unknown_approval_pending: 'in_transit',
  delivered: 'delivered',
  partial_delivered: 'delivered',
  cancelled: 'cancelled',
  unknown: 'pending',
};

/**
 * Pathao statuses arrive two ways: an `order_status_slug` from the order-info
 * endpoint and an `event` name from the webhook. Both are listed here so a
 * single lookup covers either source.
 */
const PATHAO_STATUS: Record<string, CourierStatus> = {
  // order.* webhook events
  'order.created': 'pending',
  'order.updated': 'pending',
  'order.pickup-requested': 'pending',
  'order.assigned-for-pickup': 'pending',
  'order.pickup-failed': 'pending',
  'order.pickup-cancelled': 'cancelled',
  'order.picked': 'picked',
  'order.at-the-sorting-hub': 'in_transit',
  'order.in-transit': 'in_transit',
  'order.received-at-last-mile-hub': 'in_transit',
  'order.assigned-for-delivery': 'in_transit',
  'order.delivered': 'delivered',
  'order.partial-delivery': 'delivered',
  'order.paid': 'delivered',
  'order.delivery-failed': 'in_transit',
  'order.on-hold': 'in_transit',
  'order.returned': 'returned',
  'order.paid-return': 'returned',
  'order.exchanged': 'returned',
  'order.return-id-created': 'returned',
  'order.return-in-transit': 'returned',
  'order.returned-to-merchant': 'returned',
  // order_status_slug values
  pending: 'pending',
  pickup_requested: 'pending',
  assigned_for_pickup: 'pending',
  picked: 'picked',
  pickup_failed: 'pending',
  pickup_cancelled: 'cancelled',
  at_sorting_hub: 'in_transit',
  in_transit: 'in_transit',
  received_at_last_mile_hub: 'in_transit',
  assigned_for_delivery: 'in_transit',
  delivered: 'delivered',
  partial_delivery: 'delivered',
  delivery_failed: 'in_transit',
  on_hold: 'in_transit',
  returned: 'returned',
  return_in_transit: 'returned',
  returned_to_merchant: 'returned',
  cancelled: 'cancelled',
};

const normalizeKey = (raw: string) =>
  raw.trim().toLowerCase().replace(/\s+/g, '_');

export function mapSteadfastStatus(raw: string | null | undefined): CourierStatus | null {
  if (!raw) return null;
  return STEADFAST_STATUS[normalizeKey(raw)] ?? null;
}

export function mapPathaoStatus(raw: string | null | undefined): CourierStatus | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  // Webhook events keep their dots; slugs get whitespace folded to underscores.
  return PATHAO_STATUS[key] ?? PATHAO_STATUS[normalizeKey(raw)] ?? null;
}
