import OpenStreetMapService from '@/lib/openStreetMap';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('id');

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const osm = new OpenStreetMapService();
    const details = await osm.getPlaceDetails(placeId);

    if (!details) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error('Address details error:', error);
    return NextResponse.json({ error: 'Failed to get address details' }, { status: 500 });
  }
}