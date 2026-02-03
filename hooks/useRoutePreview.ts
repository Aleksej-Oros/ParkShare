/**
 * useRoutePreview Hook
 * Manages route preview state and fetching
 * Premium-only feature for in-app route visualization
 */

import { useState, useCallback, useRef } from 'react';
import { getRoute, RouteResult, RouteError } from '@/services/routingService';

export interface RoutePreviewState {
  /** Route coordinates for polyline rendering */
  coordinates: Array<{ latitude: number; longitude: number }> | null;
  /** Distance in meters */
  distance: number | null;
  /** Duration in seconds */
  duration: number | null;
  /** Loading state */
  loading: boolean;
  /** Error message if route fetch failed */
  error: string | null;
}

/**
 * Hook for managing route preview
 * @param isPremium - Whether user has premium access (prevents API calls if false)
 * @returns Route state and functions to fetch/clear route
 */
export function useRoutePreview(isPremium: boolean) {
  const [state, setState] = useState<RoutePreviewState>({
    coordinates: null,
    distance: null,
    duration: null,
    loading: false,
    error: null,
  });

  // Cache to prevent duplicate API calls for the same route
  const routeCache = useRef<{
    from: { latitude: number; longitude: number } | null;
    to: { latitude: number; longitude: number } | null;
    result: RouteResult | null;
  }>({
    from: null,
    to: null,
    result: null,
  });
  // Prevent stale in-flight requests from restoring cleared routes
  const requestIdRef = useRef(0);

  /**
   * Fetch route from user location to destination
   * Only works for premium users
   */
  const fetchRoute = useCallback(
    async (
      from: { latitude: number; longitude: number },
      to: { latitude: number; longitude: number }
    ) => {
      const requestId = ++requestIdRef.current;
      // Premium gate: do not make API calls for free users
      if (!isPremium) {
        if (requestId !== requestIdRef.current) return;
        setState({
          coordinates: null,
          distance: null,
          duration: null,
          loading: false,
          error: 'Route preview is available for Premium users only.',
        });
        return;
      }

      // Validate inputs
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
        if (requestId !== requestIdRef.current) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Invalid coordinates provided',
        }));
        return;
      }

      // Check cache
      const cached = routeCache.current;
      if (
        cached.result &&
        cached.from &&
        cached.to &&
        Math.abs(cached.from.latitude - from.latitude) < 0.0001 &&
        Math.abs(cached.from.longitude - from.longitude) < 0.0001 &&
        Math.abs(cached.to.latitude - to.latitude) < 0.0001 &&
        Math.abs(cached.to.longitude - to.longitude) < 0.0001
      ) {
        if (requestId !== requestIdRef.current) return;
        // Use cached route
        setState({
          coordinates: cached.result.coordinates,
          distance: cached.result.distance,
          duration: cached.result.duration,
          loading: false,
          error: null,
        });
        return;
      }

      // Fetch new route
      if (requestId !== requestIdRef.current) return;
      setState({
        coordinates: null,
        distance: null,
        duration: null,
        loading: true,
        error: null,
      });

      try {
        const result = await getRoute(from, to);

        // Validate result has coordinates
        if (!result.coordinates || result.coordinates.length === 0) {
          console.error('[useRoutePreview] Route result has no coordinates:', result);
          if (requestId !== requestIdRef.current) return;
          setState({
            coordinates: null,
            distance: null,
            duration: null,
            loading: false,
            error: 'Route was fetched but contains no coordinates. Please try again.',
          });
          return;
        }

        // Cache the result
        routeCache.current = {
          from,
          to,
          result,
        };

        if (requestId !== requestIdRef.current) return;
        setState({
          coordinates: result.coordinates,
          distance: result.distance,
          duration: result.duration,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        const routeError = error as RouteError;
        console.error('[useRoutePreview] Route fetch error:', routeError);
        if (requestId !== requestIdRef.current) return;
        setState({
          coordinates: null,
          distance: null,
          duration: null,
          loading: false,
          error: routeError.message || 'Failed to fetch route',
        });
      }
    },
    [isPremium]
  );

  /**
   * Clear the current route
   */
  const clearRoute = useCallback(() => {
    requestIdRef.current += 1;
    setState({
      coordinates: null,
      distance: null,
      duration: null,
      loading: false,
      error: null,
    });
    // Clear cache
    routeCache.current = {
      from: null,
      to: null,
      result: null,
    };
  }, []);

  return {
    ...state,
    fetchRoute,
    clearRoute,
  };
}
