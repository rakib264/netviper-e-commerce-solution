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
      return NextResponse.json({ error: 'Phone number is required for testing' }, { status: 400 });
    }

    try {
      // Initialize SMS service
      const smsService = SMSService.createFromEnv();

      // Validate credentials first
      const isValid = await smsService.validateCredentials();
      if (!isValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid SMS provider credentials'
        });
      }

      // Send test message
      const testMessage = `Test message from ${process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart'} admin panel. Sent at ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}.`;
      
      const result = await smsService.sendSMS(phoneNumber, testMessage);

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test SMS sent successfully' : result.error,
        messageId: result.messageId,
        cost: result.cost
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message || 'SMS service configuration error'
      });
    }
  } catch (error) {
    console.error('SMS test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test SMS service' 
    }, { status: 500 });
  }
}