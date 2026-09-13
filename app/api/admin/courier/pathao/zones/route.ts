import { auth } from '@/lib/auth';
import { PathaoProvider } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { CourierApiError } from '@/lib/courier/types';
import { NextRequest, NextResponse } from 'next/server';

/** Zones inside one Pathao city. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cityId = Number(new URL(request.url).searchParams.get('cityId'));
    if (!Number.isFinite(cityId) || cityId <= 0) {
      return NextResponse.json({ error: 'A valid cityId is required' }, { status: 400 });
    }

    const provider = new PathaoProvider(await getCourierIntegrationSettings());
    return NextResponse.json({ zones: await provider.listZones(cityId) });
  } catch (error) {
    if (error instanceof CourierApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
    }
    console.error('Pathao zone list error:', error);
    return NextResponse.json({ error: 'Failed to load Pathao zones' }, { status: 500 });
  }
}
