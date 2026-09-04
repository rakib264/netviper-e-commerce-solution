import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PaymentSettings from '@/lib/models/PaymentSettings';

export async function GET() {
  try {
    await connectDB();
    
    let settings = await PaymentSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await PaymentSettings.create({
        isPaymentGatewayEnabled: false,
        codEnabled: true,
      });
    }
    
    // Return only public settings (no credentials)
    return NextResponse.json({
      isPaymentGatewayEnabled: settings.isPaymentGatewayEnabled,
      codEnabled: settings.codEnabled,
    });
  } catch (error) {
    console.error('Payment settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
  }
}