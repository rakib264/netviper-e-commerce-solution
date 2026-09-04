import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing complete invoice generation system...');
    
    // Import queue service dynamically
    const { default: queueService, JobType } = await import('@/lib/queue');
    
    // Create a mock order data for testing
    const mockOrderData = {
      _id: '68b1b254b9f1bfbdb2e0ca21',
      orderNumber: 'ORD-TEST-' + Date.now(),
      customer: '68b1b254b9f1bfbdb2e0ca22',
      items: [
        {
          product: {
            _id: '68b1b254b9f1bfbdb2e0ca23',
            name: 'Test Product - Premium Quality Item',
            thumbnailImage: 'https://res.cloudinary.com/rakib264/image/upload/v1756475728/smartcommerce-bd/r6xoactkt8d5ztdryujk.png'
          },
          name: 'Test Product - Premium Quality Item',
          price: 1500,
          quantity: 2,
          variant: 'Large',
          image: 'https://res.cloudinary.com/rakib264/image/upload/v1756475728/smartcommerce-bd/r6xoactkt8d5ztdryujk.png'
        },
        {
          product: {
            _id: '68b1b254b9f1bfbdb2e0ca24',
            name: 'Another Test Product',
            thumbnailImage: 'https://res.cloudinary.com/rakib264/image/upload/v1756475728/smartcommerce-bd/r6xoactkt8d5ztdryujk.png'
          },
          name: 'Another Test Product',
          price: 800,
          quantity: 1,
          variant: 'Medium',
          image: 'https://res.cloudinary.com/rakib264/image/upload/v1756475728/smartcommerce-bd/r6xoactkt8d5ztdryujk.png'
        }
      ],
      subtotal: 3800,
      tax: 380,
      taxRate: 10,
      shippingCost: 100,
      discountAmount: 200,
      total: 4080,
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      shippingAddress: {
        name: 'Test Customer',
        phone: '01234567890',
        email: 'test@customer.com',
        street: '123 Test Street, Test Area',
        city: 'Dhaka',
        district: 'Dhaka',
        division: 'Dhaka',
        postalCode: '1000'
      },
      deliveryType: 'standard',
      notes: 'This is a test order for invoice generation system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📧 Queueing invoice generation job for test order...');
    
    // Queue invoice generation job
    const invoiceJobId = await queueService.enqueue({
      type: JobType.GENERATE_INVOICE,
      orderId: mockOrderData._id,
      orderNumber: mockOrderData.orderNumber,
      customerEmail: mockOrderData.shippingAddress.email,
      customerId: mockOrderData.customer,
      orderData: mockOrderData
    } as any);

    console.log('✅ Invoice generation job queued:', invoiceJobId);

    // Process the job immediately to test the complete flow
    console.log('🔄 Processing invoice generation job immediately...');
    const result = await queueService.processJobs(1);
    console.log('📧 Invoice generation result:', result);

    return NextResponse.json({
      success: true,
      message: 'Invoice generation system test completed',
      testOrder: {
        orderNumber: mockOrderData.orderNumber,
        customerEmail: mockOrderData.shippingAddress.email,
        total: mockOrderData.total,
        items: mockOrderData.items.length
      },
      jobDetails: {
        jobId: invoiceJobId,
        jobType: 'GENERATE_INVOICE'
      },
      processingResult: result,
      envCheck: {
        BUNNY_STORAGE_ZONE_NAME: process.env.BUNNY_STORAGE_ZONE_NAME ? 'Set' : 'Not Set',
        BUNNY_STORAGE_ACCESS_KEY: process.env.BUNNY_STORAGE_ACCESS_KEY ? 'Set' : 'Not Set',
        NEXT_PUBLIC_BUNNY_CDN_URL: process.env.NEXT_PUBLIC_BUNNY_CDN_URL ? 'Set' : 'Not Set',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not Set',
        FROM_EMAIL: process.env.FROM_EMAIL || 'Not Set',
        FROM_NAME: process.env.FROM_NAME || 'Not Set',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not Set',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not Set',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not Set'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Invoice generation system test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Invoice generation system test failed',
      details: (error as Error).message,
      envCheck: {
        BUNNY_STORAGE_ZONE_NAME: process.env.BUNNY_STORAGE_ZONE_NAME ? 'Set' : 'Not Set',
        BUNNY_STORAGE_ACCESS_KEY: process.env.BUNNY_STORAGE_ACCESS_KEY ? 'Set' : 'Not Set',
        NEXT_PUBLIC_BUNNY_CDN_URL: process.env.NEXT_PUBLIC_BUNNY_CDN_URL ? 'Set' : 'Not Set',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not Set',
        FROM_EMAIL: process.env.FROM_EMAIL || 'Not Set',
        FROM_NAME: process.env.FROM_NAME || 'Not Set',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not Set',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not Set',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not Set'
      }
    }, { status: 500 });
  }
}
