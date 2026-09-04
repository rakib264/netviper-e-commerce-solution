import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Redis credentials not configured',
        envCheck: {
          UPSTASH_REDIS_REST_URL: UPSTASH_REDIS_REST_URL ? 'Set' : 'Not Set',
          UPSTASH_REDIS_REST_TOKEN: UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not Set'
        }
      }, { status: 500 });
    }

    const redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });

    const queueName = 'nextecom_tasks';
    const queueLength = await redis.llen(queueName);

    // Get recent jobs (last 5)
    const recentJobs = await redis.lrange(queueName, 0, 4);
    
    // Parse job data for display
    const parsedJobs = recentJobs.map((jobData: any, index: number) => {
      try {
        let job = jobData;
        if (typeof jobData === 'string') {
          job = JSON.parse(jobData);
        }
        if (typeof job === 'string') {
          job = JSON.parse(job);
        }
        
        return {
          index: index + 1,
          id: job.id,
          type: job.type,
          timestamp: job.timestamp,
          retries: job.retries || 0,
          maxRetries: job.maxRetries || 3
        };
      } catch (error) {
        return {
          index: index + 1,
          id: 'parse-error',
          type: 'unknown',
          timestamp: 'unknown',
          retries: 0,
          maxRetries: 3,
          error: 'Failed to parse job data'
        };
      }
    });

    return NextResponse.json({
      success: true,
      queueStatus: {
        queueName,
        queueLength,
        recentJobs: parsedJobs,
        timestamp: new Date().toISOString()
      },
      envCheck: {
        UPSTASH_REDIS_REST_URL: 'Set',
        UPSTASH_REDIS_REST_TOKEN: 'Set',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not Set',
        FROM_EMAIL: process.env.FROM_EMAIL || 'Not Set',
        FROM_NAME: process.env.FROM_NAME || 'Not Set',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not Set'
      }
    });

  } catch (error) {
    console.error('❌ Queue status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check queue status',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
