import 'server-only';

import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import { ReturnRequest } from '@/lib/models/ReturnRequest';
import connectDB from '@/lib/mongodb';
import {
  resolveReturnWindowDays,
  type IneligibilityCode,
} from '@/lib/returns/policy';

/**
 * Return eligibility, decided against the actual order.
 *
 * The old form asked the customer to type a product name into a free-text box
 * and accepted whatever they wrote — nothing tied a request to a real order
 * line, so nothing could be validated: not the product, not the quantity, not
 * the window, and certainly not a per-product rule. This resolves the order
 * first and then answers each line independently.
 */

/** One order line, with the verdict on returning it. */
export interface ReturnableLine {
  /** Absent for a combo/bundle line, which is sold as a unit of its own. */
  productId: string | null;
  name: string;
  variant?: string;
  price: number;
  /** Units bought on this line. */
  purchasedQuantity: number;
  /** Units already covered by an open or settled request. */
  requestedQuantity: number;
  /** Units still returnable. */
  availableQuantity: number;
  eligible: boolean;
  /** Set when `eligible` is false. */
  reasonCode?: IneligibilityCode;
  /** Product's own explanation, when it is switched off deliberately. */
  nonReturnableReason?: string;
  returnWindowDays: number;
  /** ISO date after which this line can no longer be returned. */
  returnWindowEndsAt: string | null;
}

export interface OrderReturnContext {
  orderId: string;
  orderNumber: string;
  /** Owner, when the order was placed by a signed-in customer. */
  customerId: string | null;
  email: string;
  orderStatus: string;
  deliveredAt: string | null;
  lines: ReturnableLine[];
  /** False when no line on the order can be returned. */
  hasReturnableLines: boolean;
}

/** The window opens at delivery, or at order date when delivery was never recorded. */
function windowStart(order: {
  deliveredAt?: Date | null;
  createdAt?: Date | null;
}): Date | null {
  const basis = order.deliveredAt || order.createdAt;
  return basis ? new Date(basis) : null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Resolve an order and describe what may be returned from it.
 *
 * Looked up by order *number* — that is what appears on the invoice and what a
 * customer has to hand — and matched on email as a second factor for guests.
 * Returns `null` when nothing matches, so the caller cannot distinguish "no
 * such order" from "not yours" and the endpoint gives away neither.
 */
export async function buildOrderReturnContext(options: {
  orderNumber: string;
  /** Required for a guest lookup; ignored when `customerId` is supplied. */
  email?: string | null;
  /** Set for a signed-in customer, and then the only accepted owner. */
  customerId?: string | null;
}): Promise<OrderReturnContext | null> {
  await connectDB();

  const orderNumber = options.orderNumber.trim();
  if (!orderNumber) return null;

  const query: Record<string, unknown> = { orderNumber };
  if (options.customerId) {
    // A signed-in customer may only reach their own orders.
    query.customer = options.customerId;
  } else if (options.email) {
    // Guests prove possession of the order with the email it was placed under.
    query['shippingAddress.email'] = options.email.trim().toLowerCase();
  } else {
    return null;
  }

  let order = await Order.findOne(query)
    .select('orderNumber customer items orderStatus deliveredAt createdAt shippingAddress')
    .lean<Record<string, any> | null>();

  // Older orders stored the contact email on the customer record rather than on
  // the shipping address, so a guest lookup falls back to matching either.
  if (!order && !options.customerId && options.email) {
    order = await Order.findOne({
      orderNumber,
      email: options.email.trim().toLowerCase(),
    })
      .select('orderNumber customer items orderStatus deliveredAt createdAt shippingAddress')
      .lean<Record<string, any> | null>();
  }

  if (!order) return null;

  const items: Array<Record<string, any>> = order.items || [];
  const productIds = items
    .map((item) => item.product)
    .filter(Boolean)
    .map((id) => String(id));

  // One query for every product on the order, and one for every prior request
  // against it — rather than a pair per line.
  const [products, priorRequests] = await Promise.all([
    productIds.length
      ? Product.find({ _id: { $in: productIds } })
          .select('_id name isReturnable nonReturnableReason returnWindowDays')
          .lean<Array<Record<string, any>>>()
      : Promise.resolve([]),
    ReturnRequest.find({
      orderId: order.orderNumber,
      // A withdrawn or refused request frees its units again.
      status: { $nin: ['cancelled', 'rejected'] },
    })
      .select('products')
      .lean<Array<Record<string, any>>>(),
  ]);

  const productById = new Map(products.map((p) => [String(p._id), p]));

  /** Units already claimed, keyed by product id and then by line name. */
  const claimed = new Map<string, number>();
  for (const request of priorRequests) {
    for (const line of request.products || []) {
      const key = line.productId
        ? `id:${String(line.productId)}`
        : `name:${String(line.productName || '').toLowerCase()}`;
      claimed.set(key, (claimed.get(key) || 0) + (Number(line.quantity) || 0));
    }
  }

  const start = windowStart(order as never);
  const isDelivered = order.orderStatus === 'delivered';

  const lines: ReturnableLine[] = items
    // A gift line was never paid for, so there is nothing to refund.
    .filter((item) => !item.isGift)
    .map((item) => {
      const productId = item.product ? String(item.product) : null;
      const product = productId ? productById.get(productId) : undefined;

      const returnWindowDays = resolveReturnWindowDays(product?.returnWindowDays);
      const endsAt = start ? addDays(start, returnWindowDays) : null;

      const purchasedQuantity = Number(item.quantity) || 0;
      const key = productId
        ? `id:${productId}`
        : `name:${String(item.name || '').toLowerCase()}`;
      const requestedQuantity = claimed.get(key) || 0;
      const availableQuantity = Math.max(0, purchasedQuantity - requestedQuantity);

      let reasonCode: IneligibilityCode | undefined;
      // Ordered by what the customer can do about it: a permanent product rule
      // first, then the clock, then quantity.
      if (product && product.isReturnable === false) {
        reasonCode = 'non_returnable';
      } else if (!isDelivered) {
        reasonCode = 'order_not_delivered';
      } else if (endsAt && endsAt.getTime() < Date.now()) {
        reasonCode = 'window_expired';
      } else if (availableQuantity <= 0) {
        reasonCode = 'quantity_exceeded';
      }

      return {
        productId,
        name: String(item.name || product?.name || ''),
        variant: item.variant || undefined,
        price: Number(item.price) || 0,
        purchasedQuantity,
        requestedQuantity,
        availableQuantity,
        eligible: !reasonCode,
        reasonCode,
        nonReturnableReason: product?.nonReturnableReason || undefined,
        returnWindowDays,
        returnWindowEndsAt: endsAt ? endsAt.toISOString() : null,
      };
    });

  return {
    orderId: String(order._id),
    orderNumber: String(order.orderNumber),
    customerId: order.customer ? String(order.customer) : null,
    email: String(order.shippingAddress?.email || order.email || ''),
    orderStatus: String(order.orderStatus || ''),
    deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
    lines,
    hasReturnableLines: lines.some((line) => line.eligible),
  };
}

export interface RequestedLine {
  productId?: string | null;
  productName: string;
  variant?: string;
  quantity: number;
  reason: string;
  details?: string;
}

export interface ValidationFailure {
  productName: string;
  code: IneligibilityCode;
  nonReturnableReason?: string;
}

/**
 * Check requested lines against the order.
 *
 * `allowOverride` is the admin's exceptional path: it relaxes the *policy*
 * rules — a product switched off, an expired window — but never the structural
 * ones. A line that is not on the order, or a quantity beyond what remains,
 * stays refused for everyone, because neither is a judgement call.
 */
export function validateRequestedLines(
  context: OrderReturnContext,
  requested: RequestedLine[],
  options: { allowOverride?: boolean } = {},
): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const overridable: IneligibilityCode[] = [
    'non_returnable',
    'window_expired',
    'order_not_delivered',
  ];

  for (const line of requested) {
    const match = context.lines.find((candidate) =>
      line.productId && candidate.productId
        ? candidate.productId === String(line.productId)
        : candidate.name.toLowerCase() === line.productName.trim().toLowerCase(),
    );

    if (!match) {
      failures.push({ productName: line.productName, code: 'not_in_order' });
      continue;
    }

    if (line.quantity > match.availableQuantity) {
      failures.push({
        productName: match.name,
        code: 'quantity_exceeded',
      });
      continue;
    }

    if (match.reasonCode && match.reasonCode !== 'quantity_exceeded') {
      if (options.allowOverride && overridable.includes(match.reasonCode)) continue;
      failures.push({
        productName: match.name,
        code: match.reasonCode,
        nonReturnableReason: match.nonReturnableReason,
      });
    }
  }

  return failures;
}
