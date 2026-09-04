import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get queue service status
    const { default: queueService } = await import('@/lib/queue');
    const stats = await queueService.getQueueStats();
    
    const isVercel = process.env.VERCEL === '1';
    
    return NextResponse.json({
      message: 'System status check completed',
      queueSystem: {
        type: 'Upstash Redis + Resend',
        status: 'active',
        stats
      },
      environment: {
        isServerless: isVercel,
        platform: isVercel ? 'Vercel' : 'Unknown'
      },
      services: {
        queueProcessor: '/api/processQueue',
        emailService: 'Resend',
        pdfService: 'Puppeteer'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System status check error:', error);
    return NextResponse.json({ 
      error: 'System status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
