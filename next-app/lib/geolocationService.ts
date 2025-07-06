interface GeolocationResult {
  city: string;
  country: string;
  formattedAddress: string;
}

class GeolocationService {
  private cache: Map<string, GeolocationResult> = new Map();

  /**
   * Reverse geocode lat/lng coordinates to city name using our API endpoint
   * @param lat Latitude
   * @param lng Longitude
   * @returns Promise<GeolocationResult>
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeolocationResult> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Call our API endpoint
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);

      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }

      const data = await response.json();

      const geolocationResult: GeolocationResult = {
        city: data.city,
        country: data.country,
        formattedAddress: data.formattedAddress,
      };

      // Cache the result
      this.cache.set(cacheKey, geolocationResult);
      return geolocationResult;
    } catch (error) {
      console.error("Geocoding API error:", error);

      // Return fallback coordinates
      const fallback: GeolocationResult = {
        city: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        country: "Unknown",
        formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
      this.cache.set(cacheKey, fallback);
      return fallback;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const geolocationService = new GeolocationService();
export type { GeolocationResult };
