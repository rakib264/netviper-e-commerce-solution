import GeonamesService from '@/lib/geonames';
// import OpenStreetMapService from '@/lib/openStreetMap'; // Commented out - using Geonames instead
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || '';
    const division = searchParams.get('division') || '';
    const district = searchParams.get('district') || '';
    const postal = searchParams.get('postal') || '';

    // For Geonames API, we primarily use postal code for geocoding
    // But also support address-based geocoding
    if (!postal && !address) {
      return NextResponse.json({ error: 'Postal code or address is required for geocoding' }, { status: 400 });
    }

    const geonamesService = new GeonamesService();

    // Use Geonames API to geocode by postal code or address
    let result;
    if (postal) {
      result = await geonamesService.geocodeByPostalCode(postal, 'BD');
    } else if (address) {
      // For address-based geocoding, we'll use a simple approach
      // Extract postal code from address if possible, otherwise return basic info
      const postalMatch = address.match(/\b\d{4}\b/);
      if (postalMatch) {
        result = await geonamesService.geocodeByPostalCode(postalMatch[0], 'BD');
      } else {
        // Return basic geocoding info for address without postal code
        return NextResponse.json({
          latitude: 23.8103, // Default to Dhaka coordinates
          longitude: 90.4125,
          address: address,
          city: district || 'Dhaka',
          area: division || 'Dhaka',
          postCode: '',
          divisionName: division || 'Dhaka',
          district: district || 'Dhaka',
          thanaOrUpazilaName: '',
          placeName: address,
          countryCode: 'BD'
        });
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Could not geocode postal code' }, { status: 404 });
    }

    // Transform the result to match the expected format for the checkout page
    const transformedResult = {
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.placeName,
      city: result.district,
      area: result.thanaOrUpazilaName,
      postCode: result.postalCode,
      // Additional Geonames-specific data
      divisionName: result.divisionName,
      district: result.district,
      thanaOrUpazilaName: result.thanaOrUpazilaName,
      placeName: result.placeName,
      countryCode: result.countryCode
    };

    const response = NextResponse.json(transformedResult);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;

    /* 
    // Commented out - OpenStreetMap implementation
    const geocoder = new OpenStreetMapService();

    // 1) Structured query first for higher accuracy
    const regionResult = await geocoder.geocodeStructured({
      street: address || undefined,
      city: district || undefined,
      state: division || undefined,
      postalcode: postal || undefined,
      countrycode: 'bd'
    });

    // 2) Fallback to free-form query combining fields
    let result = regionResult;
    if (!result) {
      const fullQuery = [address, district, division, postal].filter(Boolean).join(', ');
      if (fullQuery) {
        result = await geocoder.geocodeAddress(fullQuery);
      }
    }
    if (!result) {
      return NextResponse.json({ error: 'Could not geocode address' }, { status: 404 });
    }

    return NextResponse.json(result);
    */
  } catch (error) {
    console.error('Geocoding error:', error);
    const response = NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 });
    
    // Add CORS headers to error response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}