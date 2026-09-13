import { auth } from '@/lib/auth';
import { SteadfastProvider } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { CourierApiError } from '@/lib/courier/types';
import { NextResponse } from 'next/server';

/** Steadfast account balance — COD settlements are drawn against it. */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = new SteadfastProvider(await getCourierIntegrationSettings());
    return NextResponse.json({ balance: await provider.getBalance() });
  } catch (error) {
    if (error instanceof CourierApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
    }
    console.error('Steadfast balance error:', error);
    return NextResponse.json({ error: 'Failed to load the Steadfast balance' }, { status: 500 });
  }
}
