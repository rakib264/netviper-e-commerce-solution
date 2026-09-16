import { BRAND } from '@/lib/seo/brand';
import { auth } from '@/lib/auth';
import resendService from '@/lib/resend';
import { NextRequest, NextResponse } from 'next/server';
import { formatServerCurrency } from '@/lib/currency/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, type } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let result = false;

    if (type === 'admin') {
      await resendService.sendAdminNotification(
        email,
        `Test Email from ${BRAND.name} Admin`,
        {
          title: '🧪 Test Email',
          content: `
            <p>This is a test email sent from the ${BRAND.name} admin panel.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p>If you received this email, your email configuration is working correctly!</p>
          `
        }
      );
      result = true;
    } else if (type === 'invoice') {
      await resendService.sendInvoiceEmail(
        email,
        {
          customerName: 'Test Customer',
          orderNumber: 'TEST-ORDER-123',
          orderDate: new Date().toLocaleDateString(),
          total: await formatServerCurrency(1000),
          paymentMethod: 'Cash on Delivery',
          deliveryType: 'Home Delivery'
        }
      );
      result = true;
    }

    if (result) {
      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully',
        recipient: email,
        type
      });
    } else {
      return NextResponse.json({ 
        success: false,
        message: 'Failed to send test email',
        recipient: email,
        type
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
