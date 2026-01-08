/**
 * useMapPins Hook
 * Real-time Firestore subscription for parking spots
 * Returns pins formatted for map display
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { listenToNearbySpots } from '@/services/parkingService';
import { ParkingSpot } from '@/models/firestore';
import { ParkingStatus } from '@/models/firestore';


export interface MapPin {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  type: 'walk-in' | 'leaving-soon';
  status: ParkingStatus;
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
const FREE_USER_PIN_DELAY_MS = 30000; // 30 seconds

export function useMapPins(
  center: { latitude: number; longitude: number } | null,
  radiusM: number = 5000
) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bufferRef = useRef<MapPin[] | null>(null);
  const timeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const { user } = useAuth();

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

      // Buffer/delay logic for free users
      const isPremium = user?.isPremium === true;
      // treat undefined/null as free
      if (isPremium) {
        // Premium: immediate updates, clear any pending free-user buffer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setPins(mapPins);
        setLoading(false);
      } else {
        // Free: apply artificial delay
        bufferRef.current = mapPins;
        setLoading(false);
        // Cancel any pending update
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setPins(bufferRef.current || []);
          timeoutRef.current = null;
        }, FREE_USER_PIN_DELAY_MS);
      }
    });

    return () => {
      // Clean up timeout on unmount (free user)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      unsubscribe();
    };

  }, [center?.latitude, center?.longitude, radiusM]);

  return { pins, loading, error };
}

export default useMapPins;




