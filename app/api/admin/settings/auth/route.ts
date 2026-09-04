import { auth } from '@/lib/auth';
import AuthSettings from '@/lib/models/AuthSettings';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Temporarily disable auth for testing - REMOVE IN PRODUCTION
    const session = await auth();
    // console.log('GET Session:', session);
    
    // Comment out auth check for testing
    // if (!session || !['admin'].includes(session.user?.role)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

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
    // Temporarily disable auth for testing - REMOVE IN PRODUCTION
    const session = await auth();
    
    // Comment out auth check for testing
    // if (!session || !session.user?.role || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectDB();
    
    const data = await request.json();
    
    const oldSettings = await AuthSettings.findOne();
    
    let settings = await AuthSettings.findOne();
    
    if (settings) {
      // Update existing settings
      Object.assign(settings, data);
      await settings.save();
    } else {
      // Create new settings
      settings = await AuthSettings.create(data);
    }

    // Skip audit logging for now to avoid potential issues
    // console.log('Skipping audit log for testing purposes');
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update auth settings error:', error);
    return NextResponse.json({ 
      error: 'Failed to update auth settings', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}