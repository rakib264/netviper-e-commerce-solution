import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import Courier from '@/lib/models/Courier';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Correcting a consignment the dispatcher could not route.
 *
 * When `resolvePathaoRouting` cannot place an address, the record lands in the
 * failed lane with the reason attached and nothing is sent to Pathao. This is
 * the way back out: an admin either fixes the address, or names the Pathao
 * city/zone/area directly from the cascade in the dialog, and dispatches again.
 *
 * Deliberately narrow. `PUT /api/admin/courier/[id]` rewrites the whole record
 * from a flat payload — and collapses `receiver.city` onto the district, which
 * is precisely the field zone matching depends on. This touches only the
 * address and the routing, and clears the failure so the row leaves the lane.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const courier = await Courier.findById(id);
    if (!courier) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 });
    }
    // Re-routing something already at the carrier would only desynchronise our
    // copy from theirs; the parcel has to be cancelled with them first.
    if (courier.consignmentId) {
      return NextResponse.json(
        { error: 'This consignment is already with the carrier and cannot be re-routed.' },
        { status: 409 },
      );
    }

    const before = {
      address: courier.receiver?.address,
      city: courier.receiver?.city,
      district: courier.receiver?.district,
      division: courier.receiver?.division,
      providerMeta: courier.providerMeta,
    };

    for (const field of ['address', 'city', 'district', 'division'] as const) {
      if (typeof body[field] === 'string' && body[field].trim()) {
        courier.receiver[field] = body[field].trim();
      }
    }

    const cityId = Number(body.pathaoCityId);
    const zoneId = Number(body.pathaoZoneId);
    const areaId = Number(body.pathaoAreaId);

    if (cityId > 0 && zoneId > 0) {
      courier.providerMeta = {
        ...(courier.providerMeta ?? {}),
        pathaoCityId: cityId,
        pathaoZoneId: zoneId,
        pathaoAreaId: areaId > 0 ? areaId : undefined,
      };
    } else if (body.clearPathaoRouting === true) {
      // Let the resolver try again from the corrected address.
      courier.providerMeta = {
        ...(courier.providerMeta ?? {}),
        pathaoCityId: undefined,
        pathaoZoneId: undefined,
        pathaoAreaId: undefined,
      };
    }

    courier.dispatchError = undefined;
    courier.routingErrorKey = undefined;
    await courier.save();

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'Courier',
      resourceId: courier.courierId,
      metadata: { field: 'routing', before, after: { ...courier.receiver, ...courier.providerMeta } },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Courier routing update error:', error);
    return NextResponse.json({ error: 'Failed to update the courier routing' }, { status: 500 });
  }
}
