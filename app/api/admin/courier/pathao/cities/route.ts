import { auth } from '@/lib/auth';
import { PathaoProvider } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { CourierApiError } from '@/lib/courier/types';
import { NextResponse } from 'next/server';

/** Pathao's city list, the first step of the city → zone → area cascade. */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = new PathaoProvider(await getCourierIntegrationSettings());
    return NextResponse.json({ cities: await provider.listCities() });
  } catch (error) {
    if (error instanceof CourierApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
    }
    console.error('Pathao city list error:', error);
    return NextResponse.json({ error: 'Failed to load Pathao cities' }, { status: 500 });
  }
}
