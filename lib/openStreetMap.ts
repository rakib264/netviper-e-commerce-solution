interface OpenStreetAddress {
  id: string;
  address: string;
  city: string;
  area: string;
  postCode: string;
  latitude: number;
  longitude: number;
}

interface OpenStreetSuggestion {
  id: string;
  address: string;
  city: string;
  area: string;
  postCode: string;
}

interface OpenStreetGeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  area: string;
  postCode: string;
}

export class OpenStreetMapService {
  // Using internal proxy to avoid CORS issues
  private baseUrl = '/api/openstreetmap/proxy';

  constructor(_apiKey?: string) {
    // No API key required for Nominatim; constructor kept for compatibility
  }

  private buildHeaders() {
    return {
      'User-Agent': 'nextecom (geocoding)'
    } as Record<string, string>;
  }

  private pickAddressParts(addr: any) {
    const city = addr?.city || addr?.town || addr?.municipality || addr?.village || addr?.county || '';
    const area = addr?.suburb || addr?.neighbourhood || addr?.quarter || addr?.city_district || '';
    const postCode = addr?.postcode || '';
    return { city, area, postCode };
  }

  async searchAddress(query: string): Promise<OpenStreetSuggestion[]> {
    try {
      // Use internal proxy to avoid CORS issues
      const url = `${this.baseUrl}?endpoint=search&format=json&addressdetails=1&limit=5&countrycodes=bd&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: this.buildHeaders() });
      if (!response.ok) {
        throw new Error('Failed to search addresses');
      }
      const results = await response.json();
      return (results || []).map((item: any) => {
        const { city, area, postCode } = this.pickAddressParts(item.address);
        return {
          id: String(item.place_id),
          address: item.display_name,
          city,
          area,
          postCode
        } as OpenStreetSuggestion;
      });
    } catch (error) {
      console.error('OSM search error:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<OpenStreetAddress | null> {
    try {
      const url = `${this.baseUrl}?endpoint=lookup&format=json&addressdetails=1&place_ids=${encodeURIComponent(placeId)}`;
      const response = await fetch(url, { headers: this.buildHeaders() });
      if (!response.ok) {
        throw new Error('Failed to get place details');
      }
      const arr = await response.json();
      const place = Array.isArray(arr) && arr.length ? arr[0] : null;
      if (!place) return null;
      const { city, area, postCode } = this.pickAddressParts(place.address);
      return {
        id: String(place.place_id),
        address: place.display_name,
        city,
        area,
        postCode,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon)
      };
    } catch (error) {
      console.error('OSM place details error:', error);
      return null;
    }
  }

  async geocodeAddress(address: string): Promise<OpenStreetGeocodeResult | null> {
    try {
      const url = `${this.baseUrl}?endpoint=search&format=json&addressdetails=1&limit=1&countrycodes=bd&q=${encodeURIComponent(address)}`;
      const response = await fetch(url, { headers: this.buildHeaders() });
      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }
      const arr = await response.json();
      const first = Array.isArray(arr) && arr.length ? arr[0] : null;
      if (!first) return null;
      const { city, area, postCode } = this.pickAddressParts(first.address);
      return {
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
        address: first.display_name,
        city,
        area,
        postCode
      };
    } catch (error) {
      console.error('OSM geocoding error:', error);
      return null;
    }
  }

  async geocodeStructured(params: {
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    postalcode?: string;
    countrycode?: string; // ISO2, e.g., 'bd'
  }): Promise<OpenStreetGeocodeResult | null> {
    try {
      const qp = new URLSearchParams();
      qp.set('endpoint', 'search');
      qp.set('format', 'json');
      qp.set('addressdetails', '1');
      qp.set('limit', '1');
      qp.set('countrycodes', (params.countrycode || 'bd').toLowerCase());
      if (params.street) qp.set('street', params.street);
      if (params.city) qp.set('city', params.city);
      if (params.county) qp.set('county', params.county);
      if (params.state) qp.set('state', params.state);
      if (params.postalcode) qp.set('postalcode', params.postalcode);
      const url = `${this.baseUrl}?${qp.toString()}`;
      const response = await fetch(url, { headers: this.buildHeaders() });
      if (!response.ok) {
        throw new Error('Failed to geocode (structured)');
      }
      const arr = await response.json();
      const first = Array.isArray(arr) && arr.length ? arr[0] : null;
      if (!first) return null;
      const { city, area, postCode } = this.pickAddressParts(first.address);
      return {
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
        address: first.display_name,
        city,
        area,
        postCode
      };
    } catch (error) {
      console.error('OSM structured geocoding error:', error);
      return null;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<OpenStreetGeocodeResult | null> {
    try {
      const url = `${this.baseUrl}?endpoint=reverse&format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url, { headers: this.buildHeaders() });
      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }
      const data = await response.json();
      if (!data) return null;
      const { city, area, postCode } = this.pickAddressParts(data.address);
      return {
        latitude,
        longitude,
        address: data.display_name,
        city,
        area,
        postCode
      };
    } catch (error) {
      console.error('OSM reverse geocoding error:', error);
      return null;
    }
  }
}

export default OpenStreetMapService;