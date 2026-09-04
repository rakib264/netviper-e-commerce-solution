import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import queueService, { JobType } from '@/lib/queue';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    const order = await Order.findById(id)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name thumbnailImage');
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get customer email
    const customerEmail = order.customer?.email || order.shippingAddress?.email;
    
    if (!customerEmail) {
      return NextResponse.json({ error: 'No email address found for this order' }, { status: 400 });
    }

    // Queue invoice generation job
    try {
      // Debug: Log order details before queueing
      // console.log('🔍 Order details before queueing:', {
      //   orderId: order._id.toString(),
      //   orderNumber: order.orderNumber,
      //   customerEmail: customerEmail,
      //   customerId: order.customer?._id?.toString(),
      //   hasOrderData: !!order.toObject()
      // });

      const jobData = {
        type: JobType.GENERATE_INVOICE,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: customerEmail,
        customerId: order.customer?._id?.toString(),
        orderData: order.toObject()
      } as any;

      // console.log('🔍 Job data being queued:', {
      //   type: jobData.type,
      //   orderId: jobData.orderId,
      //   orderNumber: jobData.orderNumber,
      //   customerEmail: jobData.customerEmail,
      //   hasOrderData: !!jobData.orderData
      // });

      const jobId = await queueService.enqueue(jobData);

      // console.log('✅ Invoice generation job queued:', jobId);
      
      // Process the job immediately to ensure invoice and emails are generated
      try {
        const result = await queueService.processJobs(1);
        // console.log('📧 Invoice generation processing result:', result);
        
        if (result.processed > 0) {
          // console.log('✅ Invoice generated and emails sent successfully');
          return NextResponse.json({ 
            message: 'Invoice generated and sent successfully',
            email: customerEmail,
            method: 'immediate_processing',
            jobId,
            processed: true
          });
        } else if (result.failed > 0) {
          // console.log('❌ Invoice generation failed');
          return NextResponse.json({ 
            message: 'Invoice generation queued but processing failed',
            email: customerEmail,
            method: 'queue_retry',
            jobId,
            processed: false
          }, { status: 202 });
        } else {
          // console.log('⏳ No jobs processed (may be processing in background)');
          return NextResponse.json({ 
            message: 'Invoice generation queued for background processing',
            email: customerEmail,
            method: 'background_queue',
            jobId,
            processed: false
          });
        }
      } catch (processError) {
        console.error('❌ Error processing invoice generation job immediately:', processError);
        return NextResponse.json({ 
          message: 'Invoice generation queued but immediate processing failed',
          email: customerEmail,
          method: 'queue_fallback',
          jobId,
          processed: false,
          error: processError instanceof Error ? processError.message : 'Processing failed'
        }, { status: 202 });
      }
    } catch (queueError) {
      console.error('Invoice queue failed:', queueError);
      
      return NextResponse.json({ 
        error: 'Failed to queue invoice generation',
        details: {
          queueError: queueError instanceof Error ? queueError.message : 'Queue failed'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Send invoice error:', error);
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
  }
}
