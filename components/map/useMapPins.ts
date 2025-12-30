/**
 * useMapPins Hook
 * Real-time Firestore subscription for parking spots
 * Returns pins formatted for map display
 */
import { useState, useEffect } from 'react';
import { listenToNearbySpots } from '@/services/parkingService';
import { ParkingSpot } from '@/models/firestore';

export interface MapPin {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  type: 'walk-in' | 'leaving-soon';
  status: 'potentially-free' | 'verified' | 'expired' | 'occupied';
  expiresAt: number;
  authorId: string;
  willLeaveIn?: number;
  isPaid: boolean;
  createdAt?: number;
  title?: string;
  description?: string;
}

/**
 * Subscribe to parking spots in real-time
 * @param center - User location center point
 * @param radiusM - Radius in meters (default: 5000m = 5km)
 */
export function useMapPins(
  center: { latitude: number; longitude: number } | null,
  radiusM: number = 5000
) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!center) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = listenToNearbySpots(center, radiusM, (spots: ParkingSpot[]) => {
      const now = Date.now();
      
      // Filter out expired pins client-side - CRITICAL: expiresAt < now means expired
      // This ensures expired pins auto-disappear from map in real-time
      const activeSpots = spots.filter((spot) => {
        // Primary check: expiresAt must be in the future (milliseconds)
        if (spot.expiresAt <= now) {
          return false; // Pin is expired, remove from map
        }
        // Secondary check: status must not indicate expiration
        if (['walk_in_expired', 'leaving_soon_expired', 'expired'].includes(spot.status)) {
          return false; // Status indicates expiration, remove from map
        }
        return true; // Pin is active, keep on map
      });

      // Transform ParkingSpot to MapPin format
      const mapPins: MapPin[] = activeSpots.map((spot) => {
        // Try to get createdAt from spot, fallback to current time
        const createdAt = spot.createdAt || Date.now();

        return {
          id: spot.id,
          coordinate: {
            latitude: spot.location.latitude,
            longitude: spot.location.longitude,
          },
          type: spot.pinType,
          status: spot.status,
          expiresAt: spot.expiresAt,
          authorId: spot.userId,
          willLeaveIn: spot.willLeaveIn,
          isPaid: spot.isPaid,
          createdAt,
          title: spot.title,
          description: spot.description,
        };
      });

      setPins(mapPins);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [center?.latitude, center?.longitude, radiusM]);

  return { pins, loading, error };
}

export default useMapPins;




