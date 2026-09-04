import { auth } from '@/lib/auth';
import PaymentSettings from '@/lib/models/PaymentSettings';
import connectDB from '@/lib/mongodb';
import SSLCommerzService from '@/lib/sslcommerz';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const settings = await PaymentSettings.findOne();
    if (!settings || !settings.sslcommerzStoreId || !settings.sslcommerzStorePassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'SSLCommerz credentials not configured' 
      });
    }

    // Initialize SSLCommerz
    const sslcommerz = new SSLCommerzService(
      settings.sslcommerzStoreId,
      settings.sslcommerzStorePassword,
      settings.sslcommerzSandbox
    );

    // Test with minimal payment data
    const testData = {
      store_id: settings.sslcommerzStoreId,
      store_passwd: settings.sslcommerzStorePassword,
      total_amount: 100,
      currency: 'BDT',
      tran_id: `TEST_${Date.now()}`,
      success_url: 'https://example.com/success',
      fail_url: 'https://example.com/fail',
      cancel_url: 'https://example.com/cancel',
      ipn_url: 'https://example.com/ipn',
      shipping_method: 'NO',
      product_name: 'Test Product',
      product_category: 'Test',
      product_profile: 'general',
      cus_name: 'Test Customer',
      cus_email: 'test@example.com',
      cus_add1: 'Test Address',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      ship_name: 'Test Customer',
      ship_add1: 'Test Address',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
      ship_phone: '01700000000',
    };

    const result = await sslcommerz.initiatePayment(testData);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'SSLCommerz connection successful' 
        : result.error,
      sandbox: settings.sslcommerzSandbox
    });
  } catch (error) {
    console.error('SSLCommerz test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Connection test failed' 
    });
  }
}