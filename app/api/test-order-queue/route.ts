import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing order queue system...');
    
    // Import queue service dynamically
    const { default: queueService, JobType } = await import('@/lib/queue');
    
    // Test 1: Queue admin notification job
    console.log('📧 Queueing admin notification job...');
    const adminNotificationJobId = await queueService.enqueue({
      type: JobType.NEW_ORDER_NOTIFICATION,
      orderId: '68b1b254b9f1bfbdb2e0ca21',
      orderNumber: 'ORD-12345678',
      customerEmail: 'test@customer.com',
      customerId: 'customer123',
      total: 500
    } as any);

    console.log('✅ Admin notification job queued:', adminNotificationJobId);

    // Test 2: Queue customer order confirmation job
    console.log('📧 Queueing customer order confirmation job...');
    const orderConfirmationJobId = await queueService.enqueue({
      type: JobType.SEND_EMAIL,
      emailType: 'order_confirmation',
      to: 'test@customer.com',
      subject: 'Order Confirmation - ORD-12345678',
      data: {
        customerName: 'Test Customer',
        orderNumber: 'ORD-12345678',
        orderDate: new Date().toLocaleDateString(),
        total: '৳500',
        paymentMethod: 'Cash on Delivery',
        deliveryType: 'Standard',
        items: [
          {
            name: 'Casual Sneakers Lace-up Juta For Men',
            quantity: 1,
            price: 500
          }
        ]
      }
    } as any);

    console.log('✅ Order confirmation job queued:', orderConfirmationJobId);

    // Test 3: Process jobs immediately
    console.log('🔄 Processing order jobs immediately...');
    const result = await queueService.processJobs(5);
    console.log('📧 Order jobs processing result:', result);

    return NextResponse.json({
      success: true,
      message: 'Order queue system test completed',
      jobsQueued: {
        adminNotification: adminNotificationJobId,
        orderConfirmation: orderConfirmationJobId
      },
      processingResult: result,
      envCheck: {
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not Set',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not Set',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not Set',
        FROM_EMAIL: process.env.FROM_EMAIL || 'Not Set',
        FROM_NAME: process.env.FROM_NAME || 'Not Set',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not Set'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Order queue test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Order queue test failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
