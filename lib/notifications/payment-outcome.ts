import 'server-only';

import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { notifyCustomerPaymentOutcome } from '@/lib/notifications/events';

/**
 * Notify the customer about a gateway outcome, given only the transaction id.
 *
 * The five SSLCommerz callbacks (`success`, `fail`, `cancel`, `ipn`, and the GET
 * twin each one carries for browser redirects) all know the transaction and
 * nothing else, so each would otherwise have to re-look-up the order and repeat
 * the same guard clauses. Shared here instead, and non-fatal throughout: a
 * notification must never turn a completed payment into an error redirect.
 *
 * A guest checkout has no `customer`, so there is no inbox to write to and
 * nothing is sent — the redirect still tells them what happened.
 */
export async function notifyPaymentOutcomeByTransaction(
  transactionId: string | null | undefined,
  outcome: 'success' | 'failed' | 'cancelled',
): Promise<void> {
  if (!transactionId) return;

  try {
    await connectDB();

    const order = await Order.findOne({
      'paymentDetails.transactionId': transactionId,
    })
      .select('_id orderNumber customer')
      .lean<{ _id: unknown; orderNumber?: string; customer?: unknown } | null>();

    if (!order?.customer) return;

    await notifyCustomerPaymentOutcome({
      userId: String(order.customer),
      orderId: String(order._id),
      orderNumber: String(order.orderNumber || ''),
      outcome,
      transactionId,
    });
  } catch (error) {
    console.error(
      `[notifications] payment ${outcome} notification failed for ${transactionId}:`,
      error,
    );
  }
}
