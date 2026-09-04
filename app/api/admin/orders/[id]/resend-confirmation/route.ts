import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import queueService, { JobType } from '@/lib/queue';
import resendService from '@/lib/resend';
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

    // Try direct email sending first
    try {
      const customerName = order.customer?.firstName ? 
        `${order.customer.firstName} ${order.customer.lastName}` : 
        order.shippingAddress?.name || 'Customer';
      
      await resendService.sendOrderConfirmation(customerEmail, {
        customerName,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: order.subtotal || order.total,
        shippingCost: order.shippingCost || 0,
        total: order.total,
        paymentMethod: order.paymentMethod,
        deliveryType: order.deliveryType,
        shippingAddress: {
          name: order.shippingAddress?.name || customerName,
          phone: order.shippingAddress?.phone || '',
          address: `${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''} ${order.shippingAddress?.postalCode || ''}`.trim()
        }
      });

      return NextResponse.json({ 
        message: 'Confirmation email sent successfully',
        email: customerEmail,
        method: 'direct'
      });
    } catch (directEmailError) {
      console.error('Direct confirmation email failed:', directEmailError);
    }

    // Fallback to queue
    try {
      const jobId = await queueService.enqueue({
        type: JobType.SEND_EMAIL,
        emailType: 'order_confirmation',
        to: customerEmail,
        subject: `Order Confirmation - ${order.orderNumber}`,
        data: {
          customerName: order.customer?.firstName ? 
            `${order.customer.firstName} ${order.customer.lastName}` : 
            order.shippingAddress?.name || 'Customer',
          orderNumber: order.orderNumber,
          orderDate: new Date(order.createdAt).toLocaleDateString(),
          items: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          })),
          subtotal: order.subtotal || order.total,
          shippingCost: order.shippingCost || 0,
          total: order.total,
          paymentMethod: order.paymentMethod,
          deliveryType: order.deliveryType,
          shippingAddress: {
            name: order.shippingAddress?.name || 'Customer',
            phone: order.shippingAddress?.phone || '',
            address: `${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''} ${order.shippingAddress?.postalCode || ''}`.trim()
          }
        }
      } as any);

      return NextResponse.json({ 
        message: 'Confirmation email queued successfully',
        email: customerEmail,
        method: 'queue',
        jobId
      });
    } catch (queueError) {
      console.error('Queue confirmation failed:', queueError);
      
      return NextResponse.json({ 
        error: 'Failed to send confirmation - both direct and queue methods failed',
        details: {
          directEmailError: 'Direct email failed',
          queueError: queueError instanceof Error ? queueError.message : 'Queue failed'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
  }
}
