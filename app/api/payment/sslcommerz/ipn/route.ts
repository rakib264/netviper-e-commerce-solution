import { syncOrderRewards } from '@/lib/deals/settlement';
import Order from '@/lib/models/Order';
import PaymentSettings from '@/lib/models/PaymentSettings';
import { notifyCustomerPaymentOutcome } from '@/lib/notifications/events';
import connectDB from '@/lib/mongodb';
import SSLCommerzService from '@/lib/sslcommerz';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const transactionId = formData.get('tran_id') as string;
    const valId = formData.get('val_id') as string;
    const status = formData.get('status') as string;
    const amount = parseFloat(formData.get('amount') as string);

    // console.log('IPN received:', { transactionId, valId, status, amount });

    if (!transactionId || !valId) {
      return NextResponse.json({ error: 'Invalid IPN data' }, { status: 400 });
    }

    // Get payment settings
    const paymentSettings = await PaymentSettings.findOne();
    if (!paymentSettings) {
      return NextResponse.json({ error: 'Payment settings not found' }, { status: 400 });
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
      console.error('IPN validation failed:', validation.error);
      return NextResponse.json({ error: 'Payment validation failed' }, { status: 400 });
    }

    // Find and update order
    const order = await Order.findOne({ 'paymentDetails.transactionId': transactionId });
    if (!order) {
      console.error('Order not found for transaction:', transactionId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order based on payment status
    const updateData: any = {
      'paymentDetails.ipnReceived': true,
      'paymentDetails.ipnData': Object.fromEntries(formData),
      'paymentDetails.validationData': validation.data
    };

    if (status === 'VALID' || status === 'VALIDATED') {
      updateData.paymentStatus = 'paid';
      updateData.orderStatus = 'confirmed';
      updateData['paymentDetails.paidAt'] = new Date();
    } else {
      updateData.paymentStatus = 'failed';
      updateData['paymentDetails.failureReason'] = `IPN status: ${status}`;
    }

    await Order.findByIdAndUpdate(order._id, updateData);

    // The gateway retries IPNs and the customer's own redirect may have already
    // reported the same outcome; the dedupe key is the transaction, so whichever
    // arrives first is the only one the customer hears about.
    if (order.customer) {
      await notifyCustomerPaymentOutcome({
        userId: String(order.customer),
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ''),
        outcome: updateData.paymentStatus === 'paid' ? 'success' : 'failed',
        transactionId,
      });
    }

    // Grant the delivered-settled rewards this order earned. The gateway
    // retries IPNs, so this has to be — and is — idempotent.
    if (updateData.paymentStatus === 'paid') {
      await syncOrderRewards({
        _id: order._id,
        customer: order.customer,
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
      });
    }

    // console.log('IPN processed successfully for order:', order.orderNumber);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SSLCommerz IPN handler error:', error);
    return NextResponse.json({ error: 'IPN processing failed' }, { status: 500 });
  }
}