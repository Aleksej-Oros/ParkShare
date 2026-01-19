/**
 * Geocoding Service
 * Handles address search using Nominatim (OpenStreetMap's geocoding service)
 * Provides address suggestions based on user input
 * 
 * Note: Using Nominatim instead of OpenRouteService geocoding as it's
 * more reliable, free, and doesn't require an API key for basic usage
 */

export interface GeocodingResult {
  /** Display label for the address */
  label: string;
  /** Full address string */
  address: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** City name if available */
  city?: string;
  /** Country name if available */
  country?: string;
}

export interface GeocodingError {
  message: string;
  code?: string;
}

/**
 * Search for addresses using Nominatim (OpenStreetMap's geocoding service)
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of geocoding results
 * @throws GeocodingError if search fails
 */
export async function searchAddresses(
  query: string,
  limit: number = 10
): Promise<GeocodingResult[]> {
  // Validate query
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Nominatim (OpenStreetMap's geocoding service)
    // Free, open-source, no API key required (but User-Agent is required per usage policy)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=${limit}&addressdetails=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ParkShare/1.0', // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to search addresses (HTTP ${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += `: ${errorText.substring(0, 200)}`;
        }
      }

      throw {
        message: errorMessage,
        code: `HTTP_${response.status}`,
      } as GeocodingError;
    }

    const data = await response.json();

    // Parse Nominatim response (returns array directly)
    if (!Array.isArray(data)) {
      return [];
    }

    // Transform Nominatim results to GeocodingResult
    const results: GeocodingResult[] = data.map((item: any) => {
      // Nominatim returns lat/lon as strings
      const lat = parseFloat(item.lat) || 0;
      const lon = parseFloat(item.lon) || 0;
      const displayName = item.display_name || 'Unknown location';
      const address = item.address || {};

      // Extract address components from Nominatim format
      const city = address.city || address.town || address.village || address.municipality;
      const country = address.country;

      // Create a clean label (prefer road + house_number, fallback to display_name)
      let label = displayName;
      if (address.road && address.house_number) {
        label = `${address.road} ${address.house_number}`;
        if (city) {
          label += `, ${city}`;
        }
      } else if (address.road) {
        label = address.road;
        if (city) {
          label += `, ${city}`;
        }
      } else if (address.name) {
        label = address.name;
        if (city) {
          label += `, ${city}`;
        }
      }

      // Truncate very long labels
      if (label.length > 100) {
        label = label.substring(0, 100) + '...';
      }

      return {
        label,
        address: displayName,
        latitude: lat,
        longitude: lon,
        city: city || undefined,
        country: country || undefined,
      };
    });

    return results;
  } catch (error: any) {
    // Re-throw GeocodingError as-is
    if (error.code && error.message) {
      throw error;
    }

    // Wrap other errors
    throw {
      message: error.message || 'Unknown geocoding error',
      code: 'UNKNOWN_ERROR',
    } as GeocodingError;
  }
}
