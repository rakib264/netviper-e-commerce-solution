import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuthSettings from '@/lib/models/AuthSettings';

export async function GET() {
  try {
    await connectDB();
    
    let settings = await AuthSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await AuthSettings.create({
        googleAuthEnabled: false,
        facebookAuthEnabled: false,
        emailAuthEnabled: true,
        otpAuthEnabled: true,
        passwordMinLength: 8,
        requireEmailVerification: false,
        allowSelfRegistration: true,
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Auth settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch auth settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    
    let settings = await AuthSettings.findOne();
    
    if (settings) {
      Object.assign(settings, data);
      await settings.save();
    } else {
      settings = await AuthSettings.create(data);
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update auth settings error:', error);
    return NextResponse.json({ error: 'Failed to update auth settings' }, { status: 500 });
  }
}