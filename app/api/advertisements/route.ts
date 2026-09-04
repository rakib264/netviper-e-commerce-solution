import { AD_TYPES, type AdvertisementType } from '@/lib/advertisements/types';
import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { getCachedAdvertisements } from '@/lib/home/storefront-content';
import { NextRequest, NextResponse } from 'next/server';

/** Public read. Returns normalised DTOs so the storefront never sees legacy shapes. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const byType = await getCachedAdvertisements();
    const advertisements = AD_TYPES.includes(type as AdvertisementType)
      ? byType[type as AdvertisementType]
      : [...byType.horizontal, ...byType.vertical];

    return NextResponse.json(
      { success: true, advertisements },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Get public advertisements error:', error);
    return NextResponse.json({ error: 'Failed to fetch advertisements' }, { status: 500 });
  }
}
