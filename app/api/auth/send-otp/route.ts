import AuthSettings from '@/lib/models/AuthSettings';
import OTP from '@/lib/models/OTP';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import resendService from '@/lib/resend';
import { SMSService } from '@/lib/sms/smsService';
import { generateOTP } from '@/lib/twilio';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, email, type = 'password_reset' } = await request.json();

    if (!phone && !email) {
      return NextResponse.json({ error: 'Phone number or email is required' }, { status: 400 });
    }

    await connectDB();

    // Check admin authentication settings
    const authSettings = await AuthSettings.findOne();
    if (!authSettings) {
      return NextResponse.json({ error: 'Authentication settings not configured' }, { status: 500 });
    }

    // Check if the requested verification method is enabled
    if (phone && !authSettings.otpAuthEnabled) {
      return NextResponse.json({ error: 'Phone verification is disabled by admin' }, { status: 403 });
    }

    if (email && !authSettings.requireEmailVerification) {
      return NextResponse.json({ error: 'Email verification is disabled by admin' }, { status: 403 });
    }

    // Check if user exists for password reset
    if (type === 'password_reset') {
      let user;
      if (phone) {
        user = await User.findOne({ phone });
      } else if (email) {
        user = await User.findOne({ email });
      }
      
      if (!user) {
        return NextResponse.json({ error: 'No account found with this information' }, { status: 404 });
      }
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this phone/email
    if (phone) {
      await OTP.deleteMany({ phone, type });
    }
    if (email) {
      await OTP.deleteMany({ email, type });
    }

    // Create new OTP
    const otpData: any = {
      otp: otpCode,
      type,
      expiresAt,
    };

    if (phone) {
      otpData.phone = phone;
    }
    if (email) {
      otpData.email = email;
    }

    await OTP.create(otpData);

    let smsResult = null;
    let emailResult = null;

    // Send OTP via SMS if phone is provided
    if (phone) {
      try {
        const smsService = SMSService.createFromEnv();
        const message = `Your ${process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart'} verification code is: ${otpCode}. This code will expire in 10 minutes.`;
        smsResult = await smsService.sendSMS(phone, message);
        if (!smsResult.success) {
          console.error('SMS OTP failed:', smsResult.error);
        }
      } catch (error) {
        console.error('SMS OTP error:', error);
        smsResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Send OTP via email if email is provided
    if (email) {
      try {
        const userName = email.split('@')[0]; // Simple username extraction
        await resendService.sendOTPEmail(email, { otp: otpCode, userName, type });
        emailResult = true;
        if (!emailResult) {
          console.error('Email OTP failed');
        }
      } catch (error) {
        console.error('Email OTP error:', error);
        emailResult = false;
      }
    }

    // Check if at least one method succeeded
    if ((phone && smsResult?.success) || (email && emailResult)) {
      return NextResponse.json({ 
        message: 'OTP sent successfully',
        methods: {
          sms: phone ? smsResult?.success : null,
          email: email ? emailResult : null
        }
      });
    } else {
      // Provide more detailed error information
      const errorDetails = [];
      if (phone && !smsResult?.success) {
        errorDetails.push(`SMS: ${smsResult?.error || 'Unknown error'}`);
      }
      if (email && !emailResult) {
        errorDetails.push('Email: Failed to send email');
      }
      
      return NextResponse.json({ 
        error: 'Failed to send OTP via any method',
        details: errorDetails.join(', ')
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}