import Order from '@/lib/models/Order';
import PaymentSettings from '@/lib/models/PaymentSettings';
import connectDB from '@/lib/mongodb';
import SSLCommerzService from '@/lib/sslcommerz';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get payment settings
    const paymentSettings = await PaymentSettings.findOne();
    if (!paymentSettings || !paymentSettings.isPaymentGatewayEnabled) {
      return NextResponse.json({ error: 'Payment gateway is disabled' }, { status: 400 });
    }

    if (!paymentSettings.sslcommerzStoreId || !paymentSettings.sslcommerzStorePassword) {
      return NextResponse.json({ error: 'SSLCommerz credentials not configured' }, { status: 400 });
    }

    // Get order details
    const order = await Order.findById(orderId).populate('customer', 'firstName lastName email phone');
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Initialize SSLCommerz
    const sslcommerz = new SSLCommerzService(
      paymentSettings.sslcommerzStoreId,
      paymentSettings.sslcommerzStorePassword,
      paymentSettings.sslcommerzSandbox
    );

    const transactionId = sslcommerz.generateTransactionId();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Prepare payment data
    const paymentData = {
      store_id: paymentSettings.sslcommerzStoreId,
      store_passwd: paymentSettings.sslcommerzStorePassword,
      total_amount: order.total,
      currency: 'BDT',
      tran_id: transactionId,
      success_url: `${baseUrl}/api/payment/sslcommerz/success`,
      fail_url: `${baseUrl}/api/payment/sslcommerz/fail`,
      cancel_url: `${baseUrl}/api/payment/sslcommerz/cancel`,
      ipn_url: `${baseUrl}/api/payment/sslcommerz/ipn`,
      shipping_method: order.deliveryType,
      product_name: `Order ${order.orderNumber}`,
      product_category: 'E-commerce',
      product_profile: 'general',
      cus_name: `${order.customer.firstName} ${order.customer.lastName}`,
      cus_email: order.customer.email,
      cus_add1: order.shippingAddress.street,
      cus_city: order.shippingAddress.city,
      cus_state: order.shippingAddress.district,
      cus_postcode: order.shippingAddress.postalCode || '1000',
      cus_country: 'Bangladesh',
      cus_phone: order.shippingAddress.phone,
      ship_name: order.shippingAddress.name,
      ship_add1: order.shippingAddress.street,
      ship_city: order.shippingAddress.city,
      ship_state: order.shippingAddress.district,
      ship_postcode: order.shippingAddress.postalCode || '1000',
      ship_country: 'Bangladesh',
      ship_phone: order.shippingAddress.phone,
    };

    // Initiate payment
    const result = await sslcommerz.initiatePayment(paymentData);

    if (result.success) {
      // Update order with transaction ID
      await Order.findByIdAndUpdate(orderId, {
        'paymentDetails.transactionId': transactionId,
        'paymentDetails.gatewayData': result.data
      });

      return NextResponse.json({
        success: true,
        paymentUrl: result.data.GatewayPageURL,
        transactionId
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('SSLCommerz initiation error:', error);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}