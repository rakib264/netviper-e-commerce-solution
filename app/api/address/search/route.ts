import { OpenStreetMapService } from '@/lib/openStreetMap';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({ places: [] });
    }

    const osm = new OpenStreetMapService();
    const suggestions = await osm.searchAddress(query);

    // Transform suggestions to match the expected format
    const places = suggestions.map((suggestion) => ({
      geonameId: parseInt(suggestion.id),
      name: suggestion.city || suggestion.area || 'Unknown',
      lat: 0, // We need to get lat/lng from place details
      lng: 0,
      countryName: 'Bangladesh',
      adminName1: suggestion.city || '',
      adminName2: suggestion.area || '',
      fcodeName: suggestion.address
    }));

    // For each place, we need to get detailed location data
    const detailedPlaces = await Promise.all(
      places.slice(0, 5).map(async (place, index) => {
        try {
          const details = await osm.getPlaceDetails(suggestions[index].id);
          if (details) {
            return {
              ...place,
              lat: details.latitude,
              lng: details.longitude,
              name: details.city || details.area || place.name,
              fcodeName: details.address
            };
          }
          return place;
        } catch (error) {
          console.error('Error getting place details:', error);
          return place;
        }
      })
    );

    return NextResponse.json({ places: detailedPlaces });
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json({ error: 'Failed to search addresses' }, { status: 500 });
  }
}