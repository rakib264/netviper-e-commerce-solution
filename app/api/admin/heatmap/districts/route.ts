import {
  POSTAL_CODE_LOCATIONS,
  getDistrictId,
  normalizeDistrictName,
} from '@/lib/analytics/districts';
import { DEMAND_ORDER_STATUSES } from '@/lib/analytics/targeting';
import { auth } from '@/lib/auth';
import { PRIVATE_CACHE_HEADER } from '@/lib/cache/http';
import Order from '@/lib/models/Order';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

interface PostalCodePoint {
  postalCode: string;
  locationName: string;
  orders: number;
  revenue: number;
}

interface DistrictPoint {
  districtId: number;
  districtName: string;
  orders: number;
  revenue: number;
  postalCodes: PostalCodePoint[];
}

/**
 * A date-only bound (`2026-09-11`) parses as UTC midnight, which would silently
 * drop that whole day from an inclusive "to" filter. Push it to the last
 * millisecond of the same UTC day — `setHours` would shift it by the server's
 * offset and cut the day short again. A bound carrying a time is left alone.
 */
function parseRangeEnd(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

function parseRangeStart(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCount(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const district = searchParams.get('district')?.trim() || '';
    const postalCode = searchParams.get('postalCode')?.trim() || '';
    const orderRangeMin = parseCount(searchParams.get('orderRangeMin'));
    const orderRangeMax = parseCount(searchParams.get('orderRangeMax'));
    const dateFrom = searchParams.get('dateFrom')?.trim() || '';
    const dateTo = searchParams.get('dateTo')?.trim() || '';

    // Only settled demand feeds the map. Counting `pending` and `cancelled`
    // rows would paint districts that never actually bought anything.
    const conditions: Record<string, unknown>[] = [
      { orderStatus: { $in: [...DEMAND_ORDER_STATUSES] } },
    ];

    const createdAt: Record<string, Date> = {};
    const from = dateFrom ? parseRangeStart(dateFrom) : null;
    const to = dateTo ? parseRangeEnd(dateTo) : null;
    if (from) createdAt.$gte = from;
    if (to) createdAt.$lte = to;
    if (Object.keys(createdAt).length > 0) conditions.push({ createdAt });

    // District and postal code each need their own `$or` over two possible
    // fields. Assigning both to `query.$or` — as this route used to — made the
    // second filter overwrite the first, so combining them silently widened
    // the result instead of narrowing it. `$and` keeps them independent.
    if (district) {
      const pattern = new RegExp(district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      conditions.push({
        $or: [
          { 'shippingAddress.district': pattern },
          { 'shippingAddress.coordinates.district': pattern },
        ],
      });
    }

    if (postalCode) {
      conditions.push({
        $or: [
          { 'shippingAddress.postalCode': postalCode },
          { 'shippingAddress.coordinates.postalCode': postalCode },
        ],
      });
    }

    const aggregated = await Order.aggregate([
      { $match: { $and: conditions } },
      {
        $group: {
          _id: {
            district: {
              $ifNull: [
                '$shippingAddress.coordinates.district',
                '$shippingAddress.district',
              ],
            },
            postalCode: {
              $ifNull: [
                '$shippingAddress.coordinates.postalCode',
                '$shippingAddress.postalCode',
              ],
            },
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]);

    // Alias spellings ("Chattogram" vs "Chittagong") are folded here so a
    // district's orders land on one polygon instead of splitting across two.
    const districts = new Map<string, DistrictPoint>();
    for (const row of aggregated) {
      const districtName = normalizeDistrictName(row._id?.district);
      if (!districtName) continue;

      if (!districts.has(districtName)) {
        districts.set(districtName, {
          districtId: getDistrictId(districtName),
          districtName,
          orders: 0,
          revenue: 0,
          postalCodes: [],
        });
      }

      const point = districts.get(districtName)!;
      point.orders += row.orders;
      point.revenue += row.revenue ?? 0;

      const code = typeof row._id?.postalCode === 'string' ? row._id.postalCode.trim() : '';
      if (!code) continue;
      const existing = point.postalCodes.find((entry) => entry.postalCode === code);
      if (existing) {
        existing.orders += row.orders;
        existing.revenue += row.revenue ?? 0;
      } else {
        point.postalCodes.push({
          postalCode: code,
          locationName: POSTAL_CODE_LOCATIONS[code] ?? districtName,
          orders: row.orders,
          revenue: row.revenue ?? 0,
        });
      }
    }

    const data = [...districts.values()]
      .filter((point) => {
        if (orderRangeMin !== null && point.orders < orderRangeMin) return false;
        if (orderRangeMax !== null && point.orders > orderRangeMax) return false;
        return true;
      })
      .map((point) => ({
        ...point,
        revenue: Math.round(point.revenue * 100) / 100,
        // Ties break on postal code so repeated calls return an identical order.
        postalCodes: point.postalCodes
          .sort((a, b) => b.orders - a.orders || a.postalCode.localeCompare(b.postalCode))
          .map((entry) => ({ ...entry, revenue: Math.round(entry.revenue * 100) / 100 })),
      }))
      .sort(
        (a, b) =>
          b.orders - a.orders ||
          b.revenue - a.revenue ||
          a.districtName.localeCompare(b.districtName),
      );

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': PRIVATE_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('District heatmap API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch district heatmap data' },
      { status: 500 },
    );
  }
}
