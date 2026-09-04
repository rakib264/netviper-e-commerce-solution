import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { notifyPaymentOutcomeByTransaction } from '@/lib/notifications/payment-outcome';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const transactionId = formData.get('tran_id') as string;
    const error = formData.get('error') as string;

    if (transactionId) {
      // Update order status
      await Order.findOneAndUpdate(
        { 'paymentDetails.transactionId': transactionId },
        {
          paymentStatus: 'failed',
          'paymentDetails.failureReason': error,
          'paymentDetails.failedAt': new Date()
        }
      );
    }

    await notifyPaymentOutcomeByTransaction(transactionId, 'failed');

    return NextResponse.redirect(new URL('/checkout?error=payment_failed', request.url));
  } catch (error) {
    console.error('SSLCommerz fail handler error:', error);
    return NextResponse.redirect(new URL('/checkout?error=payment_processing_error', request.url));
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('tran_id');
  const error = searchParams.get('error');

  if (transactionId) {
    await connectDB();
    await Order.findOneAndUpdate(
      { 'paymentDetails.transactionId': transactionId },
      {
        paymentStatus: 'failed',
        'paymentDetails.failureReason': error,
        'paymentDetails.failedAt': new Date()
      }
    );
  }

  await notifyPaymentOutcomeByTransaction(transactionId, 'failed');

  return NextResponse.redirect(new URL('/checkout?error=payment_failed', request.url));
}