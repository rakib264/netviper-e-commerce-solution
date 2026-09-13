import { auth } from '@/lib/auth';
import { getCourierProvider, isCourierProviderId } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { NextRequest, NextResponse } from 'next/server';

/** Verifies stored credentials against the live provider API. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider } = await request.json();
    if (!isCourierProviderId(provider)) {
      return NextResponse.json(
        { error: 'Unknown provider. Expected "pathao" or "steadfast".' },
        { status: 400 },
      );
    }

    const settings = await getCourierIntegrationSettings();
    const adapter = await getCourierProvider(provider, settings);
    const result = await adapter.testConnection();

    return NextResponse.json({ provider, ...result });
  } catch (error) {
    console.error('Courier connection test error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 200 },
    );
  }
}
