import { BRAND } from '@/lib/seo/brand';
import { NextRequest, NextResponse } from 'next/server';
import { getEmailBodyFontStack } from '@/lib/utils/email-settings';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Resend service directly...');
    
    // Check environment variables
    const envCheck = {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Missing',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Not set',
      FROM_EMAIL: process.env.FROM_EMAIL || 'Not set',
      FROM_NAME: process.env.FROM_NAME || 'Not set',
    };

    console.log('Environment check:', envCheck);

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not found',
        envCheck
      }, { status: 500 });
    }

    if (!process.env.ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'ADMIN_EMAIL not found',
        envCheck
      }, { status: 500 });
    }

    // Import Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Prepare email data
    const emailData = {
      from: process.env.FROM_EMAIL ? 
        `${process.env.FROM_NAME || BRAND.name} <${process.env.FROM_EMAIL}>` : 
        `${BRAND.name} <onboarding@resend.dev>`,
      to: [process.env.ADMIN_EMAIL],
      subject: `🧪 Direct Resend Test - ${BRAND.name}`,
      html: `
        <div style="font-family: ${await getEmailBodyFontStack()}; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">✅ Direct Resend Test!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${BRAND.name} Email System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #333; margin-top: 0;">Test Configuration</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #28a745; margin-top: 0;">✅ Resend Service Status</h3>
              <p><strong>Service:</strong> Resend API</p>
              <p><strong>From:</strong> ${process.env.FROM_EMAIL || 'onboarding@resend.dev'}</p>
              <p><strong>To:</strong> ${process.env.ADMIN_EMAIL}</p>
              <p><strong>API Key:</strong> ${process.env.RESEND_API_KEY ? 'Configured' : 'Missing'}</p>
              <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
              <h4 style="color: #1976d2; margin-top: 0;">📋 Test Results</h4>
              <ul style="color: #333;">
                <li>✅ Resend API connection successful</li>
                <li>✅ Email composition successful</li>
                <li>✅ Email delivery initiated</li>
                <li>✅ Direct email test completed</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
              This test confirms that Resend is working independently of the queue system.
            </p>
          </div>
        </div>
      `
    };

    console.log('📧 Sending email via Resend:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    });

    // Send email
    const result = await resend.emails.send(emailData);

    console.log('📧 Resend response:', {
      success: !!result.data?.id,
      emailId: result.data?.id,
      error: result.error
    });

    if (result.error) {
      console.error('❌ Resend error:', result.error);
      return NextResponse.json({
        success: false,
        error: 'Resend API returned an error',
        resendError: result.error,
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Direct Resend test successful',
      emailId: result.data?.id,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Resend test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Resend test endpoint - Use POST to send a direct test email',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
}
