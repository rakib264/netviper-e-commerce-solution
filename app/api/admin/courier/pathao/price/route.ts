import { auth } from '@/lib/auth';
import { PathaoProvider } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { CourierApiError } from '@/lib/courier/types';
import { NextRequest, NextResponse } from 'next/server';

/** Pathao's own quote for a parcel — what the merchant will actually be charged. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const recipientCity = Number(body.recipientCity);
    const recipientZone = Number(body.recipientZone);
    if (!recipientCity || !recipientZone) {
      return NextResponse.json(
        { error: 'recipientCity and recipientZone are required' },
        { status: 400 },
      );
    }

    const provider = new PathaoProvider(await getCourierIntegrationSettings());
    const quote = await provider.calculatePrice({
      recipientCity,
      recipientZone,
      itemWeight: Number(body.itemWeight) || 0.5,
      itemType: body.itemType === undefined ? undefined : Number(body.itemType),
      deliveryType: body.deliveryType === undefined ? undefined : Number(body.deliveryType),
      storeId: body.storeId ? String(body.storeId) : undefined,
    });

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof CourierApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
    }
    console.error('Pathao price calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate the Pathao price' }, { status: 500 });
  }
}
