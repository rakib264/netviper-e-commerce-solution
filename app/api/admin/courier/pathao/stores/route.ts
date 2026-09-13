import { auth } from '@/lib/auth';
import { PathaoProvider } from '@/lib/courier/providers';
import { getCourierIntegrationSettings } from '@/lib/courier/settings';
import { CourierApiError } from '@/lib/courier/types';
import { NextRequest, NextResponse } from 'next/server';

/** The merchant's Pathao stores — the dropdown the admin picks a pickup point from. */
export async function GET() {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = new PathaoProvider(await getCourierIntegrationSettings());
    return NextResponse.json({ stores: await provider.listStores() });
  } catch (error) {
    return courierError(error, 'Failed to load Pathao stores');
  }
}

/** Creates a pickup store without leaving the dashboard. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const required = ['name', 'contact_name', 'contact_number', 'address', 'city_id', 'zone_id', 'area_id'];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const provider = new PathaoProvider(await getCourierIntegrationSettings());
    const store = await provider.createStore({
      name: String(body.name),
      contact_name: String(body.contact_name),
      contact_number: String(body.contact_number),
      secondary_contact: body.secondary_contact ? String(body.secondary_contact) : undefined,
      address: String(body.address),
      city_id: Number(body.city_id),
      zone_id: Number(body.zone_id),
      area_id: Number(body.area_id),
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    return courierError(error, 'Failed to create the Pathao store');
  }
}

function courierError(error: unknown, fallback: string) {
  if (error instanceof CourierApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
