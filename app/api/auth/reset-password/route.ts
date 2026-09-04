import OTP from '@/lib/models/OTP';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, email, newPassword } = await request.json();

    if (!newPassword || (!phone && !email)) {
      return NextResponse.json({ error: 'New password and phone/email are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    await connectDB();

    // Check if OTP was verified
    const otpQuery: any = { 
      type: 'password_reset',
      verified: true,
      expiresAt: { $gt: new Date() }
    };

    if (phone) {
      otpQuery.phone = phone;
    }
    if (email) {
      otpQuery.email = email;
    }

    const verifiedOTP = await OTP.findOne(otpQuery);

    if (!verifiedOTP) {
      return NextResponse.json({ error: 'OTP verification required' }, { status: 400 });
    }

    // Find user
    let user;
    if (phone) {
      user = await User.findOne({ phone });
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete used OTP
    await OTP.deleteOne({ _id: verifiedOTP._id });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}