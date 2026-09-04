import 'server-only';

import { formatServerCurrency } from '@/lib/currency/server';
import {
  eventForOrderStatus,
  eventForReturnStatus,
} from '@/lib/notifications/catalog';
import { dispatchNotification } from '@/lib/notifications/dispatch';

/**
 * The notification API call sites use.
 *
 * Every function here is a thin description of something that happened — ids and
 * a few display values. None of them decides a channel, writes copy, or knows
 * that OneSignal exists: that is `catalog.ts` (policy) and `dispatch.ts`
 * (delivery). Adding a call site is therefore incapable of changing push volume
 * or of leaking a hardcoded English string.
 *
 * The exported names are unchanged from the push-only version these replaced,
 * so existing call sites keep working while gaining the in-app inbox,
 * preferences, de-duplication and cooldowns.
 */

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/* ── Account ────────────────────────────────────────────────────────────── */

export async function notifyCustomerWelcome(params: {
  userId: string;
  firstName: string;
}) {
  await dispatchNotification({
    event: 'account_welcome',
    userId: params.userId,
    params: { firstName: params.firstName },
    href: '/profile',
    // Once per account, ever. Registration and the social-login path can both
    // reach this for the same user.
    dedupeKey: `account_welcome:${params.userId}`,
  });
}

export async function notifyAdminNewCustomer(params: {
  customerId: string;
  customerName: string;
  customerEmail: string;
}) {
  await dispatchNotification({
    event: 'admin_new_customer',
    params: {
      customerName: params.customerName,
      customerEmail: params.customerEmail,
    },
    href: '/admin/customers',
    data: { customerId: params.customerId },
    dedupeKey: `admin_new_customer:${params.customerId}`,
  });
}

/* ── Orders ─────────────────────────────────────────────────────────────── */

export async function notifyCustomerOrderPlaced(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
}) {
  await dispatchNotification({
    event: 'order_placed',
    userId: params.userId,
    params: { orderNumber: params.orderNumber },
    href: `/orders/${params.orderId}`,
    data: { orderId: params.orderId, orderNumber: params.orderNumber },
    dedupeKey: `order_placed:${params.orderId}`,
  });
}

export async function notifyAdminNewOrder(params: {
  orderId: string;
  orderNumber: string;
  total: number;
}) {
  await dispatchNotification({
    event: 'admin_new_order',
    params: {
      orderNumber: params.orderNumber,
      // Formatted here, in the store's configured currency, because the copy
      // template must not name one. It previously passed a bare `toFixed(2)`
      // and the locale string prefixed a literal `€`, so a BDT store showed
      // "Total: €809.00".
      total: await formatServerCurrency(params.total),
    },
    // The canonical URL: details are a dialog on the list, opened by this
    // query parameter. `/admin/orders/<id>` also works — it redirects here —
    // so notifications stored before this fix still resolve.
    href: `/admin/orders?orderId=${params.orderId}`,
    data: { orderId: params.orderId, orderNumber: params.orderNumber },
    dedupeKey: `admin_new_order:${params.orderId}`,
  });
}

export async function notifyCustomerOrderStatusChanged(params: {
  userId?: string | null;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  previousStatus?: OrderStatus;
}) {
  if (!params.userId) return;
  if (params.previousStatus && params.previousStatus === params.status) return;

  const event = eventForOrderStatus(params.status);
  // `pending` and `processing` are internal transitions with nothing to say.
  if (!event) return;

  await dispatchNotification({
    event,
    userId: params.userId,
    params: { orderNumber: params.orderNumber },
    href: `/orders/${params.orderId}`,
    data: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      status: params.status,
    },
    // Per order *and* per status, so a legitimate later transition still
    // notifies while a replayed update of the same one does not.
    dedupeKey: `${event}:${params.orderId}`,
  });
}

/* ── Payments ───────────────────────────────────────────────────────────── */

type PaymentOutcome = 'success' | 'failed' | 'cancelled';

const PAYMENT_EVENT = {
  success: 'payment_success',
  failed: 'payment_failed',
  cancelled: 'payment_cancelled',
} as const;

/**
 * A gateway outcome for one order.
 *
 * The gateway can send an IPN for the same payment the customer's redirect
 * already reported, and the customer can reload the callback URL. The dedupe key
 * is the transaction, so all of those collapse into one notification.
 */
export async function notifyCustomerPaymentOutcome(params: {
  userId?: string | null;
  orderId: string;
  orderNumber: string;
  outcome: PaymentOutcome;
  transactionId?: string;
}) {
  if (!params.userId) return;

  const event = PAYMENT_EVENT[params.outcome];

  await dispatchNotification({
    event,
    userId: params.userId,
    params: { orderNumber: params.orderNumber },
    href: `/orders/${params.orderId}`,
    data: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      transactionId: params.transactionId,
    },
    dedupeKey: `${event}:${params.transactionId || params.orderId}`,
  });
}

/* ── Returns ────────────────────────────────────────────────────────────── */

export async function notifyCustomerReturnSubmitted(params: {
  userId?: string | null;
  requestId: string;
  orderNumber?: string;
}) {
  if (!params.userId) return;

  await dispatchNotification({
    event: 'return_submitted',
    userId: params.userId,
    params: { requestId: params.requestId },
    href: `/returns?request=${encodeURIComponent(params.requestId)}`,
    data: { requestId: params.requestId, orderNumber: params.orderNumber },
    dedupeKey: `return_submitted:${params.requestId}`,
  });
}

export async function notifyCustomerReturnStatusChanged(params: {
  userId?: string | null;
  requestId: string;
  status: string;
  previousStatus?: string;
}) {
  if (!params.userId) return;
  if (params.previousStatus && params.previousStatus === params.status) return;

  const event = eventForReturnStatus(params.status);
  if (!event) return;

  await dispatchNotification({
    event,
    userId: params.userId,
    params: { requestId: params.requestId },
    href: `/returns?request=${encodeURIComponent(params.requestId)}`,
    data: { requestId: params.requestId, status: params.status },
    dedupeKey: `${event}:${params.requestId}`,
  });
}

/* ── Inventory ──────────────────────────────────────────────────────────── */

/**
 * A product crossed its low-stock threshold, or ran out.
 *
 * Both are rate limited to one alert per product per day by the catalog, using
 * a `cooldownScope` shared across every admin — so a product sitting on its
 * threshold through a busy afternoon costs one notification, not one per order.
 * Out-of-stock is treated as its own event rather than a low-stock variant,
 * because it is the more urgent fact and must not be suppressed by an earlier
 * low-stock alert for the same product.
 */
export async function notifyAdminLowStock(params: {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}) {
  const isOutOfStock = params.currentStock <= 0;
  const event = isOutOfStock ? 'admin_out_of_stock' : 'admin_low_stock';

  await dispatchNotification({
    event,
    params: {
      productName: params.productName,
      currentStock: params.currentStock,
      threshold: params.threshold,
    },
    href: `/admin/products/${params.productId}`,
    data: {
      productId: params.productId,
      currentStock: params.currentStock,
      threshold: params.threshold,
    },
    cooldownScope: `${event}:${params.productId}`,
  });
}
