import OTP from '@/lib/models/OTP';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, email, otp, type = 'password_reset' } = await request.json();

    if (!otp || (!phone && !email)) {
      return NextResponse.json({ error: 'OTP and phone/email are required' }, { status: 400 });
    }

    await connectDB();

    // Find OTP record
    const otpQuery: any = { 
      type, 
      verified: false,
      expiresAt: { $gt: new Date() }
    };

    if (phone) {
      otpQuery.phone = phone;
    }
    if (email) {
      otpQuery.email = email;
    }

    const otpRecord = await OTP.findOne(otpQuery);

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json({ error: 'Too many attempts. Please request a new OTP' }, { status: 400 });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return NextResponse.json({ 
      message: 'OTP verified successfully',
      verified: true 
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}