import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Message from '@/lib/models/Message';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { SMSService } from '@/lib/sms/smsService';
 
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { content, targetType, singleCustomerId, messageType } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (content.length > 1600) {
      return NextResponse.json({ error: 'Message too long (max 1600 characters)' }, { status: 400 });
    }

    // Get target customers based on filter
    let targetCustomers: any[] = [];

    switch (targetType) {
      case 'all':
        targetCustomers = await User.find({ 
          role: 'customer', 
          isActive: true, 
          phone: { $exists: true, $ne: '' } 
        }).select('_id firstName lastName phone email').lean();
        break;

      case 'new':
        // Customers with 0-1 orders
        const newCustomerIds = await Order.aggregate([
          { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
          { $match: { orderCount: { $lte: 1 } } },
          { $project: { _id: '$_id' } }
        ]);
        
        const newIds = newCustomerIds.map(item => item._id);
        targetCustomers = await User.find({ 
          _id: { $in: newIds },
          role: 'customer', 
          isActive: true, 
          phone: { $exists: true, $ne: '' } 
        }).select('_id firstName lastName phone email').lean();
        break;

      case 'repeated':
        // Customers with 2+ orders
        const repeatedCustomerIds = await Order.aggregate([
          { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
          { $match: { orderCount: { $gte: 2 } } },
          { $project: { _id: '$_id' } }
        ]);
        
        const repeatedIds = repeatedCustomerIds.map(item => item._id);
        targetCustomers = await User.find({ 
          _id: { $in: repeatedIds },
          role: 'customer', 
          isActive: true, 
          phone: { $exists: true, $ne: '' } 
        }).select('_id firstName lastName phone email').lean();
        break;

      case 'best':
        // Top 20% customers by total spending
        const bestCustomerIds = await Order.aggregate([
          { $group: { _id: '$customer', totalSpent: { $sum: '$total' } } },
          { $sort: { totalSpent: -1 } },
          { $limit: Math.ceil((await User.countDocuments({ role: 'customer' })) * 0.2) },
          { $project: { _id: '$_id' } }
        ]);
        
        const bestIds = bestCustomerIds.map(item => item._id);
        targetCustomers = await User.find({ 
          _id: { $in: bestIds },
          role: 'customer', 
          isActive: true, 
          phone: { $exists: true, $ne: '' } 
        }).select('_id firstName lastName phone email').lean();
        break;

      case 'single':
        if (!singleCustomerId) {
          return NextResponse.json({ error: 'Customer ID is required for single message' }, { status: 400 });
        }
        
        const singleCustomer = await User.findById(singleCustomerId)
          .select('_id firstName lastName phone email').lean();
        
        if (!singleCustomer) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }
        
        const customer = singleCustomer as any;
        if (!customer || !customer.phone) {
          return NextResponse.json({ error: 'Customer has no phone number' }, { status: 400 });
        }
        
        targetCustomers = [singleCustomer];
        break;

      default:
        return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    if (targetCustomers.length === 0) {
      return NextResponse.json({ error: 'No customers found matching the criteria' }, { status: 400 });
    }

    // Create message record
    const messageRecord = await Message.create({
      sender: session.user.id,
      content: content.trim(),
      type: messageType,
      targetFilter: {
        type: targetType,
        criteria: targetType === 'single' ? { customerId: singleCustomerId } : {}
      },
      totalRecipients: targetCustomers.length,
      provider: 'twilio',
      recipients: targetCustomers.map(customer => ({
        customer: customer._id,
        phone: customer.phone,
        status: 'pending'
      }))
    });

    // Initialize SMS service
    const smsService = SMSService.createFromEnv();

    // Send SMS messages
    const recipients = targetCustomers.map(customer => ({
      phone: customer.phone,
      customerId: customer._id.toString()
    }));

    let totalCost = 0;
    let sentCount = 0;
    let failedCount = 0;

    if (messageType === 'bulk') {
      // Send bulk SMS
      const results = await smsService.sendBulkSMS(recipients, content.trim());
      
      // Update message record with results
      for (const result of results) {
        const recipientIndex = messageRecord.recipients.findIndex(
          (r: any) => r.customer.toString() === result.customerId
        );
        
        if (recipientIndex !== -1) {
          messageRecord.recipients[recipientIndex].status = result.success ? 'sent' : 'failed';
          messageRecord.recipients[recipientIndex].sentAt = result.success ? new Date() : undefined;
          messageRecord.recipients[recipientIndex].failureReason = result.error;
          messageRecord.recipients[recipientIndex].messageId = result.messageId;
          
          if (result.success) {
            sentCount++;
            totalCost += result.cost || 0.5;
          } else {
            failedCount++;
          }
        }
      }
    } else {
      // Send individual SMS
      for (const recipient of recipients) {
        const result = await smsService.sendSMS(recipient.phone, content.trim());
        
        const recipientIndex = messageRecord.recipients.findIndex(
          (r: any) => r.customer.toString() === recipient.customerId
        );
        
        if (recipientIndex !== -1) {
          messageRecord.recipients[recipientIndex].status = result.success ? 'sent' : 'failed';
          messageRecord.recipients[recipientIndex].sentAt = result.success ? new Date() : undefined;
          messageRecord.recipients[recipientIndex].failureReason = result.error;
          messageRecord.recipients[recipientIndex].messageId = result.messageId;
          
          if (result.success) {
            sentCount++;
            totalCost += result.cost || 0.5;
          } else {
            failedCount++;
          }
        }

        // Add delay between individual messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update message record with final counts
    messageRecord.sentCount = sentCount;
    messageRecord.failedCount = failedCount;
    messageRecord.cost = totalCost;
    messageRecord.completedAt = new Date();
    await messageRecord.save();

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Message',
      resourceId: messageRecord._id.toString(),
      metadata: {
        messageType,
        targetType,
        recipientCount: targetCustomers.length,
        sentCount,
        failedCount,
        cost: totalCost
      }
    });

    return NextResponse.json({
      message: 'Message sent successfully',
      results: {
        total: targetCustomers.length,
        sent: sentCount,
        failed: failedCount,
        cost: totalCost
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}