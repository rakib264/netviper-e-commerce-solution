import { QUEUE_NAME } from '@/lib/queue';
import { BRAND } from '@/lib/seo/brand';
import { NextRequest, NextResponse } from 'next/server';
import { getEmailBodyFontStack } from '@/lib/utils/email-settings';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual queue consumption started...');
    
    // Check environment variables
    const envCheck = {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Missing',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Missing',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Missing',
      FROM_EMAIL: process.env.FROM_EMAIL || 'Not set',
      FROM_NAME: process.env.FROM_NAME || 'Not set',
    };

    console.log('Environment check:', envCheck);

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Upstash Redis credentials not found',
        envCheck
      }, { status: 500 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not found',
        envCheck
      }, { status: 500 });
    }

    // Import dependencies
    const { Redis } = await import('@upstash/redis');
    const { Resend } = await import('resend');

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get queue stats
    // Imported, not repeated: see QUEUE_NAME in lib/queue.ts.
    const queueName = QUEUE_NAME;
    const queueLength = await redis.llen(queueName);
    
    console.log('📊 Queue stats:', {
      queueName,
      queueLength
    });

    if (queueLength === 0) {
      return NextResponse.json({
        success: true,
        message: 'No jobs in queue',
        queueLength: 0,
        processed: 0,
        envCheck
      });
    }

    // Dequeue one job
    const jobData = await redis.rpop(queueName);
    
    if (!jobData) {
      return NextResponse.json({
        success: true,
        message: 'No job data received',
        queueLength,
        processed: 0,
        envCheck
      });
    }

    console.log('📦 Job dequeued:', jobData);

    let job;
    try {
      // Handle different data types from Redis
      let jobString: string;
      if (typeof jobData === 'string') {
        jobString = jobData;
      } else if (typeof jobData === 'object') {
        jobString = JSON.stringify(jobData);
      } else {
        throw new Error(`Invalid job data type: ${typeof jobData}`);
      }

      job = JSON.parse(jobString);
      
      console.log('✅ Job parsed successfully:', {
        id: job.id,
        type: job.type,
        timestamp: job.timestamp
      });
    } catch (parseError) {
      console.error('❌ Failed to parse job data:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse job data',
        jobData,
        envCheck
      }, { status: 500 });
    }

    // Process the job
    if (job.type === 'send_email') {
      console.log('📧 Processing email job:', {
        to: job.payload.to,
        subject: job.payload.subject
      });

      try {
        const emailResult = await resend.emails.send({
          from: process.env.FROM_EMAIL ? 
            `${process.env.FROM_NAME || BRAND.name} <${process.env.FROM_EMAIL}>` : 
            `${BRAND.name} <onboarding@resend.dev>`,
          to: [job.payload.to],
          subject: job.payload.subject,
          html: job.payload.html
        });

        console.log('📧 Email sent successfully:', {
          jobId: job.id,
          emailId: emailResult.data?.id,
          to: job.payload.to,
          subject: job.payload.subject
        });

        return NextResponse.json({
          success: true,
          message: 'Job processed successfully',
          jobId: job.id,
          jobType: job.type,
          emailResult: {
            id: emailResult.data?.id,
            error: emailResult.error
          },
          queueLength: queueLength - 1,
          processed: 1,
          envCheck
        });

      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        
        // Put job back in queue for retry
        await redis.lpush(queueName, jobData);
        
        return NextResponse.json({
          success: false,
          error: 'Email sending failed',
          jobId: job.id,
          emailError: emailError instanceof Error ? emailError.message : 'Unknown error',
          queueLength,
          processed: 0,
          envCheck
        }, { status: 500 });
      }
    } else if (job.type === 'contact_form_notification') {
      console.log('📧 Processing contact form notification:', {
        to: job.adminEmail,
        from: job.email,
        subject: job.subject
      });

      try {
        const emailResult = await resend.emails.send({
          from: process.env.FROM_EMAIL ? 
            `${process.env.FROM_NAME || BRAND.name} <${process.env.FROM_EMAIL}>` : 
            `${BRAND.name} <onboarding@resend.dev>`,
          to: [job.adminEmail],
          subject: `[${BRAND.name}] ${job.subject}`,
          html: `
            <div style="font-family: ${await getEmailBodyFontStack()}; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #3949AB;">New Contact Form Submission</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${job.name}</p>
                <p><strong>Email:</strong> ${job.email}</p>
                <p><strong>Subject:</strong> ${job.subject}</p>
                <p><strong>Message:</strong></p>
                <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #3949AB;">
                  ${job.message.replace(/\n/g, '<br>')}
                </div>
              </div>
              <p style="color: #666; font-size: 14px;">
                This message was sent via the ${BRAND.name} contact form.
              </p>
            </div>
          `,
          replyTo: `${job.name} <${job.email}>`
        });

        console.log('📧 Contact form notification sent successfully:', {
          jobId: job.id,
          emailId: emailResult.data?.id,
          to: job.adminEmail,
          from: job.email,
          subject: job.subject
        });

        return NextResponse.json({
          success: true,
          message: 'Contact form notification processed successfully',
          jobId: job.id,
          jobType: job.type,
          emailResult: {
            id: emailResult.data?.id,
            error: emailResult.error
          },
          queueLength: queueLength - 1,
          processed: 1,
          envCheck
        });

      } catch (emailError) {
        console.error('❌ Contact form email sending failed:', emailError);
        
        // Put job back in queue for retry
        await redis.lpush(queueName, jobData);
        
        return NextResponse.json({
          success: false,
          error: 'Contact form email sending failed',
          jobId: job.id,
          emailError: emailError instanceof Error ? emailError.message : 'Unknown error',
          queueLength,
          processed: 0,
          envCheck
        }, { status: 500 });
      }
    } else if (job.type === 'generate_invoice') {
      console.log('📄 Processing invoice generation job...');
      
      try {
        // Import queue service to use the processGenerateInvoiceJob method
        const { default: queueService } = await import('@/lib/queue');
        
        // Process the invoice generation job
        await (queueService as any).processGenerateInvoiceJob(job);
        
        console.log('✅ Invoice generation job processed successfully');
        
        return NextResponse.json({
          success: true,
          message: 'Invoice generation job processed successfully',
          jobId: job.id,
          jobType: job.type,
          orderNumber: job.orderNumber,
          queueLength: queueLength - 1,
          processed: 1,
          envCheck
        });
        
      } catch (invoiceError) {
        console.error('❌ Invoice generation failed:', invoiceError);
        
        // Put job back in queue for retry
        await redis.lpush(queueName, jobData);
        
        return NextResponse.json({
          success: false,
          error: 'Invoice generation failed',
          jobId: job.id,
          jobType: job.type,
          invoiceError: invoiceError instanceof Error ? invoiceError.message : 'Unknown error',
          queueLength,
          processed: 0,
          envCheck
        }, { status: 500 });
      }
    } else {
      console.log('⚠️ Unknown job type:', job.type);
      return NextResponse.json({
        success: false,
        error: `Unknown job type: ${job.type}`,
        jobId: job.id,
        jobType: job.type,
        queueLength,
        processed: 0,
        envCheck
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Queue consumption failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Queue consumption endpoint - Use POST to manually process one job',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
}
