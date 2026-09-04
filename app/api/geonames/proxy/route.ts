import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const postalcode = searchParams.get('postalcode');
    const country = searchParams.get('country') || 'BD';
    const username = searchParams.get('username') || 'redwan_rakib';

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }

    // Validate endpoint to prevent SSRF attacks
    const allowedEndpoints = ['postalCodeSearchJSON', 'searchJSON', 'findNearbyJSON'];
    if (!allowedEndpoints.includes(endpoint)) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    // Build the Geonames API URL
    const baseUrl = 'http://api.geonames.org';
    const url = new URL(`${baseUrl}/${endpoint}`);
    
    // Add required parameters
    url.searchParams.set('username', username);
    
    // Add optional parameters
    if (postalcode) url.searchParams.set('postalcode', postalcode);
    if (country) url.searchParams.set('country', country);
    
    // Add any other query parameters from the request
    searchParams.forEach((value, key) => {
      if (!['endpoint', 'postalcode', 'country', 'username'].includes(key)) {
        url.searchParams.set(key, value);
      }
    });

    console.log('Proxying request to:', url.toString());

    // Make the request to Geonames API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'NextEcom/1.0',
        'Accept': 'application/json',
      },
      // Add timeout for serverless functions
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error('Geonames API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Geonames API error: ${response.status}` }, 
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
    console.error('Geonames proxy error:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch data from Geonames API' }, 
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
