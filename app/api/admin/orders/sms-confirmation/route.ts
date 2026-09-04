import { auth } from '@/lib/auth';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { SMSService } from '@/lib/sms/smsService';
import { NextRequest, NextResponse } from 'next/server';
import { getServerCurrencyFormatter } from '@/lib/currency/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { orderIds } = await request.json();
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Invalid order IDs' }, { status: 400 });
    }

    // Get confirmed orders only
    const orders = await Order.find({ 
      _id: { $in: orderIds },
      orderStatus: 'confirmed' // Only confirmed orders are eligible
    }).populate('customer', 'firstName lastName phone');


    if (orders.length === 0) {
      return NextResponse.json({ 
        error: 'No confirmed orders found. Only confirmed orders are eligible for SMS confirmation.',
        eligibleCount: 0,
        totalRequested: orderIds.length
      }, { status: 400 });
    }

    // Prepare bulk SMS recipients data
    const recipients: Array<{ phone: string; customerId: string }> = [];
    const smsData: Array<{phoneNumber: string, customerName: string, orderNumber: string, amount: number}> = [];
    const orderNumbers: string[] = [];

    orders.forEach(order => {
      const phoneNumber = order.customer?.phone || order.shippingAddress?.phone;
      if (phoneNumber) {
        const customerName = order.customer
          ? order.customer.firstName
          : (order.shippingAddress?.name || 'Customer').split(' ')[0];
        
        recipients.push({
          phone: phoneNumber,
          customerId: order._id.toString()
        });
        
        smsData.push({
          phoneNumber,
          customerName,
          orderNumber: order.orderNumber,
          amount: order.total
        });
        orderNumbers.push(order.orderNumber);
      }
    });

    if (recipients.length === 0) {
      return NextResponse.json({ 
        error: 'No phone numbers found for the confirmed orders',
        eligibleCount: orders.length
      }, { status: 400 });
    }

    // console.log(`Sending bulk SMS to ${recipients.length} customers for orders: ${orderNumbers.join(', ')}`);

    // Initialize SMS service
    const smsService = SMSService.createFromEnv();

    // Send bulk SMS efficiently with personalized messages
    let smsResults = [];
    try {
      // Group recipients by their personalized messages
      const messageGroups = new Map<string, Array<{ phone: string; customerId: string }>>();

      // The store's configured currency, not a hardcoded taka sign.
      const money = await getServerCurrencyFormatter();
      
      recipients.forEach((recipient, index) => {
        const data = smsData[index];
        const message = `Hi ${data.customerName}, Order ${data.orderNumber} confirmed! Amount: ${money(data.amount)}\nRegards, Muscari Mart`;
        
        // console.log(`Preparing SMS for ${recipient.phone} (${data.customerName}): ${message}`);
        
        if (!messageGroups.has(message)) {
          messageGroups.set(message, []);
        }
        messageGroups.get(message)!.push(recipient);
      });

      // Send each group of identical messages in bulk
      for (const [message, recipientGroup] of messageGroups) {
        // console.log(`Sending bulk SMS with message: "${message}" to ${recipientGroup.length} recipients`);
        const result = await smsService.sendBulkSMS(recipientGroup, message);
        smsResults.push(...result);
      }
    } catch (error) {
      console.error('Failed to send bulk SMS:', error);
      // Fallback to individual SMS if bulk fails
      smsResults = recipients.map(recipient => ({
        customerId: recipient.customerId,
        phone: recipient.phone,
        success: false,
        error: error instanceof Error ? error.message : 'Bulk SMS failed'
      }));
    }

    // Count successful sends
    const successfulSends = smsResults.filter(result => result.success).length;
    const failedSends = smsResults.filter(result => !result.success);

    // console.log(`SMS Results: ${successfulSends} successful, ${failedSends.length} failed`);

    // Calculate total cost if available
    const totalCost = smsResults.reduce((sum, result) => {
      return sum + ((result as any).cost || 0);
    }, 0);

    return NextResponse.json({
      message: `Bulk SMS sent to ${successfulSends} out of ${recipients.length} customers`,
      totalOrders: orders.length,
      eligibleOrders: orders.length,
      totalRequested: orderIds.length,
      successfulSends,
      failedSends: failedSends.length,
      totalCost: totalCost > 0 ? totalCost : undefined,
      results: smsResults,
      orderNumbers,
      smsData: smsData.map(d => ({ customerName: d.customerName, orderNumber: d.orderNumber, phone: d.phoneNumber }))
    });

  } catch (error) {
    console.error('SMS confirmation error:', error);
    return NextResponse.json({ 
      error: 'Failed to send SMS confirmations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
