import { OpenStreetMapService } from '@/lib/openStreetMap';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const osm = new OpenStreetMapService();
    const result = await osm.reverseGeocode(lat, lng);

    if (result) {
      return NextResponse.json({
        address: result.address,
        city: result.city,
        area: result.area,
        postCode: result.postCode,
        latitude: result.latitude,
        longitude: result.longitude
      });
    } else {
      return NextResponse.json({
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng
      });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json({ error: 'Failed to reverse geocode' }, { status: 500 });
  }
}
