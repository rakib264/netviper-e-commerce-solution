import CourierSettings from '@/lib/models/CourierSettings';
import connectDB from '@/lib/mongodb';
import { NextResponse } from 'next/server';

// Public API endpoint for courier delivery charges
export async function GET() {
  try {
    await connectDB();

    let settings = await CourierSettings.findOne();
    if (!settings) {
      settings = await CourierSettings.create({});
    }

    const publicCourierSettings = {
      insideDhaka: settings.deliveryCharges?.regularWithinDhaka ?? 60,
      outsideDhaka: settings.deliveryCharges?.regularOutsideDhaka ?? 120,
    };

    return NextResponse.json(publicCourierSettings, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Public courier settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch courier settings' }, { status: 500 });
  }
}


