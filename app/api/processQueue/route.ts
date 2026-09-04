import queueService from '@/lib/queue';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Process Queue API Endpoint
 * 
 * This endpoint processes all queued jobs from Upstash Redis.
 * It can be called manually or set up as a cron job on Vercel.
 * 
 * Usage:
 * - Manual: POST /api/processQueue
 * - Cron: Set up Vercel cron job to call this endpoint every minute
 * - Query params: ?batchSize=10&maxRunTime=25000
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batchSize') || '10');
    const maxRunTime = parseInt(searchParams.get('maxRunTime') || '25000'); // 25 seconds max for Vercel

    console.log('🚀 Starting queue processing...', {
      batchSize,
      maxRunTime,
      timestamp: new Date().toISOString()
    });

    // Get initial queue stats
    const initialStats = await queueService.getQueueStats();
    console.log('📊 Initial queue stats:', initialStats);

    let totalProcessed = 0;
    let totalFailed = 0;
    let iterations = 0;

    // Process jobs until we hit time limit or no more jobs
    while (Date.now() - startTime < maxRunTime) {
      iterations++;
      
      console.log(`🔄 Processing batch ${iterations}...`);
      
      const result = await queueService.processJobs(batchSize);
      
      totalProcessed += result.processed;
      totalFailed += result.failed;

      console.log(`✅ Batch ${iterations} completed:`, {
        processed: result.processed,
        failed: result.failed,
        totalProcessed,
        totalFailed,
        elapsedTime: Date.now() - startTime
      });

      // If no jobs were processed in this batch, break the loop
      if (result.processed === 0 && result.failed === 0) {
        console.log('📭 No more jobs to process, stopping...');
        break;
      }

      // Small delay between batches to prevent overwhelming the system
      if (result.processed > 0 || result.failed > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Get final queue stats
    const finalStats = await queueService.getQueueStats();
    const processingTime = Date.now() - startTime;

    const summary = {
      success: true,
      processingTime: `${processingTime}ms`,
      iterations,
      totalProcessed,
      totalFailed,
      initialStats,
      finalStats,
      processed: totalProcessed > 0 || totalFailed > 0
    };

    console.log('🎉 Queue processing completed:', summary);

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Queue processing error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process queue',
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    }, { status: 500 });
  }
}

/**
 * GET endpoint for queue statistics and health check
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await queueService.getQueueStats();
      
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'health') {
      // Basic health check
      const stats = await queueService.getQueueStats();
      
      return NextResponse.json({
        success: true,
        status: 'healthy',
        upstashRedis: 'connected',
        stats,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'clear-failed') {
      const clearedCount = await queueService.clearFailedJobs();
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${clearedCount} failed jobs`,
        clearedCount,
        timestamp: new Date().toISOString()
      });
    }

    // Default: return basic info
    return NextResponse.json({
      success: true,
      message: 'Queue processor API',
      endpoints: {
        'POST /api/processQueue': 'Process queued jobs',
        'GET /api/processQueue?action=stats': 'Get queue statistics',
        'GET /api/processQueue?action=health': 'Health check',
        'GET /api/processQueue?action=clear-failed': 'Clear failed jobs'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Queue API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
