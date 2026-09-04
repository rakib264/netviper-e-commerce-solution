import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const query = searchParams.get('q');
    const format = searchParams.get('format') || 'json';
    const addressdetails = searchParams.get('addressdetails') || '1';
    const limit = searchParams.get('limit') || '5';
    const countrycodes = searchParams.get('countrycodes') || 'bd';
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const place_ids = searchParams.get('place_ids');

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }

    // Validate endpoint to prevent SSRF attacks
    const allowedEndpoints = ['search', 'reverse', 'lookup'];
    if (!allowedEndpoints.includes(endpoint)) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    // Build the OpenStreetMap Nominatim API URL
    const baseUrl = 'https://nominatim.openstreetmap.org';
    const url = new URL(`${baseUrl}/${endpoint}`);
    
    // Add required parameters
    url.searchParams.set('format', format);
    url.searchParams.set('addressdetails', addressdetails);
    
    // Add optional parameters based on endpoint
    if (endpoint === 'search') {
      if (query) url.searchParams.set('q', query);
      if (limit) url.searchParams.set('limit', limit);
      if (countrycodes) url.searchParams.set('countrycodes', countrycodes);
    } else if (endpoint === 'reverse') {
      if (lat) url.searchParams.set('lat', lat);
      if (lon) url.searchParams.set('lon', lon);
    } else if (endpoint === 'lookup') {
      if (place_ids) url.searchParams.set('place_ids', place_ids);
    }
    
    // Add any other query parameters from the request
    searchParams.forEach((value, key) => {
      if (!['endpoint', 'q', 'format', 'addressdetails', 'limit', 'countrycodes', 'lat', 'lon', 'place_ids'].includes(key)) {
        url.searchParams.set(key, value);
      }
    });

    console.log('Proxying request to:', url.toString());

    // Make the request to OpenStreetMap Nominatim API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'nextecom (geocoding)',
        'Accept': 'application/json',
      },
      // Add timeout for serverless functions
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error('OpenStreetMap API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `OpenStreetMap API error: ${response.status}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the data with proper CORS headers
    const nextResponse = NextResponse.json(data);
    
    // Add CORS headers
    nextResponse.headers.set('Access-Control-Allow-Origin', '*');
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    nextResponse.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return nextResponse;

  } catch (error) {
    console.error('OpenStreetMap proxy error:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch data from OpenStreetMap API' }, 
      { status: 500 }
    );
    
    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return errorResponse;
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
