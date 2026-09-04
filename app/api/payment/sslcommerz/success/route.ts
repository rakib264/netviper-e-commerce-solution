import { syncOrderRewards } from '@/lib/deals/settlement';
import Order from '@/lib/models/Order';
import PaymentSettings from '@/lib/models/PaymentSettings';
import connectDB from '@/lib/mongodb';
import SSLCommerzService from '@/lib/sslcommerz';
import { NextRequest, NextResponse } from 'next/server';
import { notifyCustomerPaymentOutcome } from '@/lib/notifications/events';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const transactionId = formData.get('tran_id') as string;
    const valId = formData.get('val_id') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const cardType = formData.get('card_type') as string;
    const status = formData.get('status') as string;

    if (!transactionId || !valId) {
      return NextResponse.redirect(new URL('/checkout?error=invalid_transaction', request.url));
    }

    // Get payment settings
    const paymentSettings = await PaymentSettings.findOne();
    if (!paymentSettings) {
      return NextResponse.redirect(new URL('/checkout?error=payment_config_error', request.url));
    }

    // Initialize SSLCommerz for validation
    const sslcommerz = new SSLCommerzService(
      paymentSettings.sslcommerzStoreId,
      paymentSettings.sslcommerzStorePassword,
      paymentSettings.sslcommerzSandbox
    );

    // Validate payment
    const validation = await sslcommerz.validatePayment(valId);
    
    if (!validation.success) {
      return NextResponse.redirect(new URL('/checkout?error=payment_validation_failed', request.url));
    }

    // Find order by transaction ID
    const order = await Order.findOne({ 'paymentDetails.transactionId': transactionId });
    if (!order) {
      return NextResponse.redirect(new URL('/checkout?error=order_not_found', request.url));
    }

    // Verify amount matches
    if (Math.abs(validation.data.amount - order.total) > 1) {
      return NextResponse.redirect(new URL('/checkout?error=amount_mismatch', request.url));
    }

    // Update order status
    await Order.findByIdAndUpdate(order._id, {
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      'paymentDetails.validationId': valId,
      'paymentDetails.cardType': cardType,
      'paymentDetails.paidAmount': amount,
      'paymentDetails.paidAt': new Date(),
      'paymentDetails.gatewayResponse': validation.data
    });

    // Same idempotency story as the rewards sync below: the dedupe key is the
    // transaction, so a reloaded callback or a following IPN adds nothing.
    if (order.customer) {
      await notifyCustomerPaymentOutcome({
        userId: String(order.customer),
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ''),
        outcome: 'success',
        transactionId,
      });
    }

    // Grant the delivered-settled rewards this order earned. The customer can
    // reload this callback and the gateway can also send an IPN for the same
    // payment, so it has to be — and is — idempotent.
    await syncOrderRewards({
      _id: order._id,
      customer: order.customer,
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
    });

    // Redirect to success page
    return NextResponse.redirect(new URL(`/orders/${order._id}?payment=success`, request.url));
  } catch (error) {
    console.error('SSLCommerz success handler error:', error);
    return NextResponse.redirect(new URL('/checkout?error=payment_processing_error', request.url));
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests (some gateways send GET)
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('tran_id');
  const valId = searchParams.get('val_id');
  
  if (!transactionId || !valId) {
    return NextResponse.redirect(new URL('/checkout?error=invalid_transaction', request.url));
  }

  // Process similar to POST
  return POST(request);
}