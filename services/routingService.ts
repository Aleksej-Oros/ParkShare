/**
 * Routing Service
 * Handles OpenRouteService Directions API integration
 * Provides route calculation between two coordinates
 */

import Constants from 'expo-constants';
import { getApiKey } from '@/config/routingConfig';

export interface RouteResult {
  /** Polyline coordinates in [latitude, longitude] format for react-native-maps */
  coordinates: Array<{ latitude: number; longitude: number }>;
  /** Distance in meters */
  distance: number;
  /** Duration in seconds */
  duration: number;
}

export interface RouteError {
  message: string;
  code?: string;
}

/**
 * Decode polyline string to coordinates
 * Uses the Google polyline encoding algorithm
 * Returns coordinates in [longitude, latitude] format (GeoJSON standard)
 */
function decodePolyline(encoded: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // Return as [longitude, latitude] (GeoJSON format)
    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

/**
 * Get route from user location to destination
 * @param from - Starting coordinates {latitude, longitude}
 * @param to - Destination coordinates {latitude, longitude}
 * @returns RouteResult with polyline, distance, and duration
 * @throws RouteError if routing fails
 */
export async function getRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<RouteResult> {
  // Try multiple ways to access the API key (Expo supports both)
  // In Expo, EXPO_PUBLIC_ variables are available at build time
  const apiKey = 
    getApiKey() ||
    process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY ||
    (Constants.expoConfig?.extra as any)?.openRouteServiceApiKey ||
    (Constants.manifest?.extra as any)?.openRouteServiceApiKey;

  console.log('[routingService] API Key check:', {
    hasProcessEnv: !!process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY,
    processEnvValue: process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY ? '***' + process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY.slice(-4) : 'undefined',
    hasConstantsExtra: !!((Constants.expoConfig?.extra as any)?.openRouteServiceApiKey || (Constants.manifest?.extra as any)?.openRouteServiceApiKey),
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
  });

  if (!apiKey || apiKey.trim() === '') {
    throw {
      message: 'OpenRouteService API key is not configured. Please set EXPO_PUBLIC_OPENROUTESERVICE_API_KEY in your .env file and restart the Expo server.',
      code: 'MISSING_API_KEY',
    } as RouteError;
  }

  // Validate coordinates
  if (
    typeof from.latitude !== 'number' ||
    typeof from.longitude !== 'number' ||
    typeof to.latitude !== 'number' ||
    typeof to.longitude !== 'number' ||
    isNaN(from.latitude) ||
    isNaN(from.longitude) ||
    isNaN(to.latitude) ||
    isNaN(to.longitude)
  ) {
    throw {
      message: 'Invalid coordinates provided',
      code: 'INVALID_COORDINATES',
    } as RouteError;
  }

  try {
    // OpenRouteService Directions API endpoint
    // API expects coordinates as [longitude, latitude] and returns GeoJSON by default
    // Try both query parameter and Authorization header approaches
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`;

    console.log('[routingService] Making API request:', {
      url: url,
      from: `${from.longitude},${from.latitude}`,
      to: `${to.longitude},${to.latitude}`,
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/geo+json',
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to get route (HTTP ${response.status})`;
      
      console.error('[routingService] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.substring(0, 500), // First 500 chars
      });
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        // If parsing fails, include the raw error text
        if (errorText) {
          errorMessage += `: ${errorText.substring(0, 200)}`;
        }
      }

      throw {
        message: errorMessage,
        code: `HTTP_${response.status}`,
      } as RouteError;
    }

    const data = await response.json();

    console.log('[routingService] API Response:', {
      hasFeatures: !!data.features,
      featuresCount: data.features?.length || 0,
      firstFeature: data.features?.[0] ? {
        hasGeometry: !!data.features[0].geometry,
        geometryType: data.features[0].geometry?.type,
        hasCoordinates: Array.isArray(data.features[0].geometry?.coordinates),
        coordinatesLength: data.features[0].geometry?.coordinates?.length,
        hasEncoded: !!data.features[0].geometry?.encoded,
      } : null,
    });

    // Extract route information
    if (!data.features || !data.features[0] || !data.features[0].geometry) {
      console.error('[routingService] Invalid response structure:', data);
      throw {
        message: 'Invalid route response format',
        code: 'INVALID_RESPONSE',
      } as RouteError;
    }

    const feature = data.features[0];
    const geometry = feature.geometry;
    const properties = feature.properties;

    console.log('[routingService] Geometry details:', {
      geometryType: geometry?.type,
      hasCoordinates: Array.isArray(geometry?.coordinates),
      coordinatesType: Array.isArray(geometry?.coordinates) ? typeof geometry.coordinates[0] : 'N/A',
      coordinatesLength: Array.isArray(geometry?.coordinates) ? geometry.coordinates.length : 0,
      hasEncoded: !!geometry?.encoded,
      encodedLength: geometry?.encoded?.length || 0,
    });

    // OpenRouteService returns coordinates in GeoJSON format: [longitude, latitude]
    let geoJsonCoordinates: Array<[number, number]> = [];

    if (Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0) {
      // Check if coordinates are nested arrays (GeoJSON LineString format)
      const firstCoord = geometry.coordinates[0];
      if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
        // Coordinates are in format [[lng, lat], [lng, lat], ...]
        geoJsonCoordinates = geometry.coordinates as Array<[number, number]>;
      } else {
        console.error('[routingService] Unexpected coordinate format:', firstCoord);
        throw {
          message: 'Unexpected coordinate format in response',
          code: 'INVALID_COORDINATE_FORMAT',
        } as RouteError;
      }
    } else if (geometry.encoded) {
      // Coordinates are encoded, need to decode
      geoJsonCoordinates = decodePolyline(geometry.encoded);
    } else {
      console.error('[routingService] No valid geometry found:', {
        hasCoordinates: Array.isArray(geometry?.coordinates),
        hasEncoded: !!geometry?.encoded,
        geometry,
      });
      throw {
        message: 'Route geometry not found in response',
        code: 'MISSING_GEOMETRY',
      } as RouteError;
    }

    if (geoJsonCoordinates.length === 0) {
      console.error('[routingService] Empty coordinates array after parsing');
      throw {
        message: 'Route has no coordinates',
        code: 'EMPTY_COORDINATES',
      } as RouteError;
    }

    // Convert from GeoJSON [longitude, latitude] to react-native-maps {latitude, longitude}
    const coordinates = geoJsonCoordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    console.log('[routingService] Processed route:', {
      geoJsonCoordinatesCount: geoJsonCoordinates.length,
      coordinatesCount: coordinates.length,
      firstCoord: coordinates[0],
      lastCoord: coordinates[coordinates.length - 1],
    });

    // Extract distance and duration from summary
    const summary = properties?.summary || {};
    const distance = summary.distance || 0;
    const duration = summary.duration || 0;

    const result = {
      coordinates,
      distance: Math.round(distance),
      duration: Math.round(duration),
    };

    console.log('[routingService] Route result:', {
      coordinatesCount: result.coordinates.length,
      distance: result.distance,
      duration: result.duration,
    });

    return result;
  } catch (error: any) {
    // Re-throw RouteError as-is
    if (error.code && error.message) {
      throw error;
    }

    // Wrap other errors
    throw {
      message: error.message || 'Unknown routing error',
      code: 'UNKNOWN_ERROR',
    } as RouteError;
  }
}
