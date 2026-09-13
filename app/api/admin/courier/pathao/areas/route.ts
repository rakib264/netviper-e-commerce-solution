import { auth } from '@/lib/auth';
import { PathaoProvider } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { CourierApiError } from '@/lib/courier/types';
import { NextRequest, NextResponse } from 'next/server';

/** Areas inside one Pathao zone. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const zoneId = Number(new URL(request.url).searchParams.get('zoneId'));
    if (!Number.isFinite(zoneId) || zoneId <= 0) {
      return NextResponse.json({ error: 'A valid zoneId is required' }, { status: 400 });
    }

    const provider = new PathaoProvider(await getCourierIntegrationSettings());
    return NextResponse.json({ areas: await provider.listAreas(zoneId) });
  } catch (error) {
    if (error instanceof CourierApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
    }
    console.error('Pathao area list error:', error);
    return NextResponse.json({ error: 'Failed to load Pathao areas' }, { status: 500 });
  }
}
