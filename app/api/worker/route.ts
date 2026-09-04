import { NextResponse } from 'next/server';

export async function POST() {
  const startTime = Date.now();

  try {
    const { default: queueService } = await import('@/lib/queue');

    const result = await queueService.processJobs(10);
    const stats = await queueService.getQueueStats();

    return NextResponse.json({
      success: true,
      message: 'Queue worker completed',
      processed: result.processed,
      failed: result.failed,
      pending: stats.pending,
      failedQueue: stats.failed,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Queue worker failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Queue worker endpoint',
    methods: ['POST'],
    timestamp: new Date().toISOString(),
  });
}
