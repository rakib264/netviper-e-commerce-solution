import { NextRequest, NextResponse } from 'next/server';
import { getEmailBodyFontStack } from '@/lib/utils/email-settings';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Upstash Queue - Enqueueing test job...');
    
    // Check environment variables
    const envCheck = {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Missing',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Missing',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not set',
    };

    console.log('Environment check:', envCheck);

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Upstash Redis credentials not found',
        envCheck
      }, { status: 500 });
    }

    if (!process.env.ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'ADMIN_EMAIL not found',
        envCheck
      }, { status: 500 });
    }

    // Import Upstash Redis
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Create test job
    const testJob = {
      id: `test-${Date.now()}`,
      type: 'send_email',
      payload: {
        to: process.env.ADMIN_EMAIL,
        subject: '🧪 Queue Test - Muscari Mart',
        html: `
          <div style="font-family: ${await getEmailBodyFontStack()}; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3949AB;">✅ Queue Test Successful!</h2>
            <p>This email was sent via the Upstash Redis queue system.</p>
            <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Test Details:</h3>
              <p><strong>Job ID:</strong> test-${Date.now()}</p>
              <p><strong>Queue:</strong> Upstash Redis</p>
              <p><strong>Email Service:</strong> Resend</p>
              <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <p>If you receive this email, the queue system is working correctly!</p>
          </div>
        `
      },
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };

    console.log('📝 Test job created:', {
      id: testJob.id,
      type: testJob.type,
      to: testJob.payload.to,
      subject: testJob.payload.subject
    });

    // Enqueue the job
    const queueName = 'nextecom_tasks';
    const result = await redis.lpush(queueName, JSON.stringify(testJob));

    console.log('✅ Job enqueued successfully:', {
      jobId: testJob.id,
      queueName,
      queueLength: result
    });

    return NextResponse.json({
      success: true,
      message: 'Test job enqueued successfully',
      jobId: testJob.id,
      queueName,
      queueLength: result,
      envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Queue test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Queue test endpoint - Use POST to enqueue a test job',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
}
