import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import PaymentSettings from '@/lib/models/PaymentSettings';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    let settings = await PaymentSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await PaymentSettings.create({
        isPaymentGatewayEnabled: false,
        sslcommerzStoreId: '',
        sslcommerzStorePassword: '',
        sslcommerzSandbox: true,
        codEnabled: true,
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Payment settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const data = await request.json();
    const oldSettings = await PaymentSettings.findOne();
    
    let settings = await PaymentSettings.findOne();
    
    if (settings) {
      Object.assign(settings, data);
      await settings.save();
    } else {
      settings = await PaymentSettings.create(data);
    }

    // Log audit
    const changes = [];
    if (oldSettings) {
      for (const key in data) {
        if (oldSettings[key] !== data[key]) {
          changes.push({
            field: key,
            oldValue: oldSettings[key],
            newValue: data[key]
          });
        }
      }
    }

    await AuditLog.create({
      user: session.user.id,
      action: oldSettings ? 'UPDATE' : 'CREATE',
      resource: 'PaymentSettings',
      resourceId: settings._id.toString(),
      changes,
      metadata: { settingsType: 'payment' }
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update payment settings error:', error);
    return NextResponse.json({ error: 'Failed to update payment settings' }, { status: 500 });
  }
}