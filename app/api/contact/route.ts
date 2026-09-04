import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Contact API is working',
    methods: ['GET', 'POST', 'OPTIONS'],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Log the submission for debugging
    console.log('Contact form submission received:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (!adminEmail) {
      console.error('Admin email not configured');
      return NextResponse.json({ error: 'Admin email not configured.' }, { status: 500 });
    }

    try {
      console.log('Queueing contact form notification job for:', adminEmail);
      
      // Import queue service dynamically
      const { default: queueService, JobType } = await import('@/lib/queue');
      
      // Queue contact form notification job
      const jobId = await queueService.enqueue({
        type: JobType.CONTACT_FORM_NOTIFICATION,
        name,
        email,
        subject,
        message,
        adminEmail
      } as any);

      console.log('✅ Contact form notification job queued:', jobId);
      
      // Process the job immediately to ensure email is sent
      try {
        console.log('🔄 Processing contact form job immediately...');
        const result = await queueService.processJobs(1);
        console.log('📧 Contact form job processing result:', result);
        
        if (result.processed > 0) {
          console.log('✅ Contact form email sent successfully');
        } else if (result.failed > 0) {
          console.log('❌ Contact form email failed to send');
        }
      } catch (processError) {
        console.error('❌ Error processing contact form job immediately:', processError);
        // Don't fail the request, just log the error
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Contact form submitted successfully. We will get back to you soon!',
        jobId
      });
    } catch (queueError) {
      console.error('Queue error:', queueError);
      // Return success even if queueing fails, but log the error
      return NextResponse.json({ 
        success: true,
        message: 'Contact form received, but notification queueing failed',
        warning: 'Please contact us directly if urgent'
      });
    }
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}


