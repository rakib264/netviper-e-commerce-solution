import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import CourierSettings from '@/lib/models/CourierSettings';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    let settings = await CourierSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await CourierSettings.create({
        senderInfo: {
          name: '',
          phone: '',
          address: '',
          division: '',
          district: '',
        },
        deliveryCharges: {
          regularWithinDhaka: 60,
          regularOutsideDhaka: 120,
          expressWithinDhaka: 100,
          expressOutsideDhaka: 150,
          sameDayWithinDhaka: 150,
          fragileHandlingCharge: 20,
        },
        codChargeRate: 1,
        weightBasedCharging: true,
        freeDeliveryThreshold: 1000,
        defaultCourierPartners: ['steadfast'],
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Courier settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch courier settings' }, { status: 500 });
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
    const oldSettings = await CourierSettings.findOne();
    
    let settings = await CourierSettings.findOne();
    
    if (settings) {
      Object.assign(settings, data);
      await settings.save();
    } else {
      settings = await CourierSettings.create(data);
    }

    // Log audit
    const changes = [];
    if (oldSettings) {
      for (const key in data) {
        if (typeof data[key] === 'object' && data[key] !== null) {
          // Handle nested objects
          for (const nestedKey in data[key]) {
            if (oldSettings[key] && oldSettings[key][nestedKey] !== data[key][nestedKey]) {
              changes.push({
                field: `${key}.${nestedKey}`,
                oldValue: oldSettings[key][nestedKey],
                newValue: data[key][nestedKey]
              });
            }
          }
        } else if (oldSettings[key] !== data[key]) {
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
      resource: 'CourierSettings',
      resourceId: settings._id.toString(),
      changes,
      metadata: { settingsType: 'courier' }
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update courier settings error:', error);
    return NextResponse.json({ error: 'Failed to update courier settings' }, { status: 500 });
  }
}
