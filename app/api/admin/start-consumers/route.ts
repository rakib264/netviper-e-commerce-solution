import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process queue manually
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/processQueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json({ 
        message: 'Queue processed successfully',
        status: 'processed',
        ...result
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to process queue',
        status: 'failed',
        details: result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing queue:', error);
    return NextResponse.json({ 
      error: 'Failed to process queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { default: queueService } = await import('@/lib/queue');
    const stats = await queueService.getQueueStats();
    
    return NextResponse.json({
      message: 'Queue system status',
      type: 'Upstash Redis + Resend',
      status: 'active',
      processing: 'Automatic via Vercel Cron (every minute)',
      stats,
      endpoints: {
        process: '/api/processQueue',
        stats: '/api/processQueue?action=stats',
        health: '/api/processQueue?action=health'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking queue status:', error);
    return NextResponse.json({ 
      error: 'Failed to check queue status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
