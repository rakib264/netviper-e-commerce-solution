/**
 * The notification catalog: every event the system can emit, and the policy
 * that governs it.
 *
 * One table, because the expensive decision — does this event justify spending
 * a push credit? — should be reviewable in one place rather than inferred from
 * nineteen call sites. A call site says *what happened*; this table says who
 * hears about it and through which channel.
 *
 * The bias throughout is: **in-app is free, push is not.** In-app is on for
 * every transactional event. Push is reserved for events a person needs to know
 * about while they are not looking at the site — money moved, goods moved, or
 * stock ran out. Anything a customer will see the next time they open their
 * orders page (a payment succeeding, a return entering review) is in-app only.
 */

export const NOTIFICATION_EVENTS = [
  // Customer
  'account_welcome',
  'order_placed',
  'payment_success',
  'payment_failed',
  'payment_cancelled',
  'order_status_confirmed',
  'order_status_shipped',
  'order_status_delivered',
  'order_status_cancelled',
  'return_submitted',
  'return_status_received',
  'return_status_in_review',
  'return_status_approved',
  'return_status_rejected',
  'return_status_completed',
  // Admin / ops
  'admin_new_order',
  'admin_low_stock',
  'admin_out_of_stock',
  'admin_new_customer',
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationAudience = 'customer' | 'admin';

/**
 * Which preference gate a push has to pass.
 *
 * `operational` is the admin channel: staff opt out with `push.enabled`, but
 * there is no separate "do not tell me about orders" switch for the people
 * running the shop. `marketing` exists so the gate is already in place — no
 * event in this catalog uses it, and none should be added here without a
 * consent story.
 */
export type PushCategory = 'orderUpdates' | 'operational' | 'marketing';

export interface NotificationDefinition {
  audience: NotificationAudience;
  /** In-app is written whenever true; push is only *considered* when true. */
  channels: { inApp: boolean; push: boolean };
  pushCategory: PushCategory;
  titleKey: string;
  bodyKey: string;
  /**
   * Suppress a repeat of this event in the same `cooldownScope` for this long.
   *
   * Only for events driven by a threshold rather than by a discrete action: a
   * product hovering on its low-stock line would otherwise alert on every order
   * that touches it.
   */
  cooldownMs?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Locale namespace for all notification copy. */
const K = 'notifications.events';

export const NOTIFICATION_CATALOG: Record<NotificationEvent, NotificationDefinition> = {
  /* ── Customer ─────────────────────────────────────────────────────────── */

  account_welcome: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.accountWelcome.title`,
    bodyKey: `${K}.accountWelcome.body`,
  },

  order_placed: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.orderPlaced.title`,
    bodyKey: `${K}.orderPlaced.body`,
  },

  // In-app only: the customer is on the success page as this fires, and will see
  // it again on the order itself. A push would tell them what they are looking at.
  payment_success: {
    audience: 'customer',
    channels: { inApp: true, push: false },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.paymentSuccess.title`,
    bodyKey: `${K}.paymentSuccess.body`,
  },

  // Push: the order is stuck until they act, and they may well have closed the tab.
  payment_failed: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.paymentFailed.title`,
    bodyKey: `${K}.paymentFailed.body`,
  },

  payment_cancelled: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.paymentCancelled.title`,
    bodyKey: `${K}.paymentCancelled.body`,
  },

  // In-app only: confirmation follows placement within minutes, and the customer
  // was already pushed for the placement itself.
  order_status_confirmed: {
    audience: 'customer',
    channels: { inApp: true, push: false },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.orderConfirmed.title`,
    bodyKey: `${K}.orderConfirmed.body`,
  },

  order_status_shipped: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.orderShipped.title`,
    bodyKey: `${K}.orderShipped.body`,
  },

  order_status_delivered: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.orderDelivered.title`,
    bodyKey: `${K}.orderDelivered.body`,
  },

  order_status_cancelled: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.orderCancelled.title`,
    bodyKey: `${K}.orderCancelled.body`,
  },

  return_submitted: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.returnSubmitted.title`,
    bodyKey: `${K}.returnSubmitted.body`,
  },

  // Progress through review is in-app only — it is information, not a decision.
  return_status_received: {
    audience: 'customer',
    channels: { inApp: true, push: false },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.returnReceived.title`,
    bodyKey: `${K}.returnReceived.body`,
  },

  return_status_in_review: {
    audience: 'customer',
    channels: { inApp: true, push: false },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.returnInReview.title`,
    bodyKey: `${K}.returnInReview.body`,
  },

  // An outcome the customer is waiting on. Worth a push.
  return_status_approved: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.returnApproved.title`,
    bodyKey: `${K}.returnApproved.body`,
  },

  return_status_rejected: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.returnRejected.title`,
    bodyKey: `${K}.returnRejected.body`,
  },

  return_status_completed: {
    audience: 'customer',
    channels: { inApp: true, push: true },
    pushCategory: 'orderUpdates',
    titleKey: `${K}.returnCompleted.title`,
    bodyKey: `${K}.returnCompleted.body`,
  },

  /* ── Admin / ops ──────────────────────────────────────────────────────── */

  admin_new_order: {
    audience: 'admin',
    channels: { inApp: true, push: true },
    pushCategory: 'operational',
    titleKey: `${K}.adminNewOrder.title`,
    bodyKey: `${K}.adminNewOrder.body`,
  },

  // Threshold-driven, so rate limited: one alert per product per day however
  // many orders push it further below the line.
  admin_low_stock: {
    audience: 'admin',
    channels: { inApp: true, push: true },
    pushCategory: 'operational',
    titleKey: `${K}.adminLowStock.title`,
    bodyKey: `${K}.adminLowStock.body`,
    cooldownMs: DAY_MS,
  },

  admin_out_of_stock: {
    audience: 'admin',
    channels: { inApp: true, push: true },
    pushCategory: 'operational',
    titleKey: `${K}.adminOutOfStock.title`,
    bodyKey: `${K}.adminOutOfStock.body`,
    cooldownMs: DAY_MS,
  },

  // In-app only: a signup is worth recording, not worth interrupting anyone for.
  admin_new_customer: {
    audience: 'admin',
    channels: { inApp: true, push: false },
    pushCategory: 'operational',
    titleKey: `${K}.adminNewCustomer.title`,
    bodyKey: `${K}.adminNewCustomer.body`,
  },
};

/** Order status → catalog event. `pending` and `processing` notify nobody. */
export function eventForOrderStatus(status: string): NotificationEvent | null {
  switch (status) {
    case 'confirmed':
      return 'order_status_confirmed';
    case 'shipped':
      return 'order_status_shipped';
    case 'delivered':
      return 'order_status_delivered';
    case 'cancelled':
      return 'order_status_cancelled';
    default:
      return null;
  }
}

/**
 * Return-request status → catalog event.
 *
 * The stored enum is `pending | approved | rejected | processing | shipped |
 * delivered | completed | cancelled`. `pending` is the submission itself and is
 * notified by `return_submitted`, so it maps to nothing here; `processing` is
 * the review stage. `shipped` and `delivered` describe a replacement in transit
 * and are treated like the order equivalents.
 */
export function eventForReturnStatus(status: string): NotificationEvent | null {
  switch (status) {
    case 'processing':
      return 'return_status_in_review';
    case 'approved':
      return 'return_status_approved';
    case 'rejected':
      return 'return_status_rejected';
    case 'completed':
      return 'return_status_completed';
    case 'shipped':
    case 'delivered':
      return 'return_status_received';
    case 'cancelled':
      return 'return_status_rejected';
    default:
      return null;
  }
}
