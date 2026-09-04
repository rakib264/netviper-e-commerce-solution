import { auth } from '@/lib/auth';
import queueService from '@/lib/queue';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queueStats = await queueService.getQueueStats();
    
    const systemStatus = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not Set',
        upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not Set',
        resendApiKey: process.env.RESEND_API_KEY ? 'Set' : 'Not Set',
        fromEmail: process.env.FROM_EMAIL || 'Default (onboarding@resend.dev)',
        adminEmail: process.env.ADMIN_EMAIL || 'Not Set',
        smsApiKey: process.env.SMS_API_KEY ? 'Set' : 'Not Set',
        smsApiBaseUrl: process.env.SMS_API_BASE_URL || 'Not Set',
        smsSenderId: process.env.SMS_SENDER_ID || 'Not Set'
      },
      services: {
        queue: {
          pending: queueStats.pending,
          failed: queueStats.failed,
          status: 'Connected'
        },
        email: {
          configured: !!(process.env.RESEND_API_KEY),
          status: process.env.RESEND_API_KEY ? 'Configured (Resend)' : 'Not Configured'
        },
        sms: {
          configured: !!(process.env.SMS_API_KEY && process.env.SMS_API_BASE_URL),
          status: (process.env.SMS_API_KEY && process.env.SMS_API_BASE_URL) ? 'Configured' : 'Not Configured'
        }
      },
      recommendations: [] as string[]
    };

    // Add recommendations based on missing configurations
    if (queueStats.failed > 0) {
      systemStatus.recommendations.push(`${queueStats.failed} jobs have failed. Check queue processing logs.`);
    }

    if (!systemStatus.services.email.configured) {
      systemStatus.recommendations.push('Email service is not configured. Set RESEND_API_KEY environment variable.');
    }

    if (!systemStatus.services.sms.configured) {
      systemStatus.recommendations.push('SMS service is not configured. Set SMS_API_KEY and SMS_API_BASE_URL environment variables.');
    }

    if (!systemStatus.environment.adminEmail || systemStatus.environment.adminEmail === 'Not Set') {
      systemStatus.recommendations.push('ADMIN_EMAIL is not set. Admin notifications will not be sent.');
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      systemStatus.recommendations.push('Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    }

    return NextResponse.json(systemStatus);

  } catch (error) {
    console.error('System debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
