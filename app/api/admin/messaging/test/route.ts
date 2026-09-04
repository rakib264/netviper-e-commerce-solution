import { auth } from '@/lib/auth';
import { SMSService } from '@/lib/sms/smsService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Initialize SMS service
    const smsService = SMSService.createFromEnv();

    // Test message
    const testMessage = `Test message from ${process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart'} admin panel. Sent at ${new Date().toLocaleString()}.`;

    // Send test SMS
    const result = await smsService.sendSMS(phoneNumber, testMessage);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully',
        messageId: result.messageId,
        cost: result.cost
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('SMS test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test SMS' 
    }, { status: 500 });
  }
}