// Geonames API Service for postal code geocoding
export interface GeonamesPostalCode {
  adminCode2: string;
  adminName3: string;
  adminCode1: string;
  adminName2: string;
  lng: number;
  countryCode: string;
  postalCode: string;
  adminName1: string;
  "ISO3166-2": string;
  placeName: string;
  lat: number;
}

export interface GeonamesResponse {
  postalCodes: GeonamesPostalCode[];
}

export interface GeonamesGeocodeResult {
  divisionName: string;
  district: string;
  thanaOrUpazilaName: string;
  placeName: string;
  lat: number;
  lng: number;
  countryCode: string;
  postalCode: string;
  latitude: number; // alias for lat for backward compatibility
  longitude: number; // alias for lng for backward compatibility
}

export class GeonamesService {
  private username = 'redwan_rakib';
  private isServerSide: boolean;

  constructor() {
    // Detect if we're running on server-side or client-side
    this.isServerSide = typeof window === 'undefined';
  }

  /**
   * Search for location by postal code using Geonames API
   * @param postalCode - The postal code to search for
   * @param countryCode - Country code (default: 'BD' for Bangladesh)
   * @returns Promise<GeonamesGeocodeResult | null>
   */
  async geocodeByPostalCode(
    postalCode: string, 
    countryCode: string = 'BD'
  ): Promise<GeonamesGeocodeResult | null> {
    try {
      if (!postalCode?.trim()) {
        return null;
      }

      // Use internal proxy API route to avoid CORS issues
      const url = `/api/geonames/proxy?endpoint=postalCodeSearchJSON&postalcode=${encodeURIComponent(postalCode.trim())}&country=${countryCode}&username=${this.username}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Geonames API error: ${response.status}`);
      }

      const data: GeonamesResponse = await response.json();

      if (!data.postalCodes || data.postalCodes.length === 0) {
        return null;
      }

      // Get the first result and transform it
      const result = data.postalCodes[0];
      
      return this.transformGeonamesResult(result);
    } catch (error) {
      console.error('Geonames geocoding error:', error);
      return null;
    }
  }

  /**
   * Transform Geonames postal code result to our format
   * @param result - Raw Geonames postal code result
   * @returns Transformed result with our naming convention
   */
  private transformGeonamesResult(result: GeonamesPostalCode): GeonamesGeocodeResult {
    return {
      divisionName: result.adminName1,
      district: result.adminName2,
      thanaOrUpazilaName: result.adminName3,
      placeName: result.placeName,
      lat: result.lat,
      lng: result.lng,
      countryCode: result.countryCode,
      postalCode: result.postalCode,
      // Backward compatibility aliases
      latitude: result.lat,
      longitude: result.lng
    };
  }

  /**
   * Search multiple postal codes (for future use if needed)
   * @param postalCode - The postal code to search for
   * @param countryCode - Country code (default: 'BD' for Bangladesh)
   * @returns Promise<GeonamesGeocodeResult[]>
   */
  async searchPostalCodes(
    postalCode: string, 
    countryCode: string = 'BD'
  ): Promise<GeonamesGeocodeResult[]> {
    try {
      if (!postalCode?.trim()) {
        return [];
      }

      // Use internal proxy API route to avoid CORS issues
      const url = `/api/geonames/proxy?endpoint=postalCodeSearchJSON&postalcode=${encodeURIComponent(postalCode.trim())}&country=${countryCode}&username=${this.username}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NextEcom/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Geonames API error: ${response.status}`);
      }

      const data: GeonamesResponse = await response.json();

      if (!data.postalCodes || data.postalCodes.length === 0) {
        return [];
      }

      // Transform all results
      return data.postalCodes.map(result => this.transformGeonamesResult(result));
    } catch (error) {
      console.error('Geonames search error:', error);
      return [];
    }
  }
}

export default GeonamesService;
