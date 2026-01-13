/**
 * useMapPins Hook
 * Real-time Firestore subscription for parking spots
 * Returns pins formatted for map display
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { listenToNearbySpots } from '@/services/parkingService';
import { ParkingSpot, ParkingStatus } from '@/models/firestore';

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
  description?: string;
}

const FREE_USER_PIN_DELAY_MS = 30000; // 30 seconds

export function useMapPins(
  center: { latitude: number; longitude: number } | null,
  radiusM: number = 5000
) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid || null);

  useEffect(() => {
    if (!center) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToNearbySpots(center, radiusM, (spots: ParkingSpot[]) => {
      const now = Date.now();

      // 1️⃣ Filter expired pins FIRST (no expired pin should ever render)
      const activeSpots = spots.filter((spot) => {
        if (typeof spot.expiresAt !== 'number' || spot.expiresAt <= now) {
          return false;
        }
        if (['walk_in_expired', 'leaving_soon_expired', 'expired'].includes(spot.status)) {
          return false;
        }
        return true;
      });

      // 2️⃣ Transform to MapPin
      const mapPins: MapPin[] = activeSpots.map((spot) => ({
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
        createdAt: spot.createdAt || Date.now(),
        description: spot.description,
      }));

      // 3️⃣ DO NOT apply delay until profile is loaded
      if (profileLoading) {
        setPins(mapPins);
        setLoading(false);
        return;
      }

      const isPremium = profile?.isPremium === true;
      const currentUserId = user?.uid;

      // 4️⃣ Premium users: instant pins
      if (isPremium) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setPins(mapPins);
        setLoading(false);
        return;
      }

      // 5️⃣ Free users: own pins instant, others delayed
      const ownPins = mapPins.filter((pin) => pin.authorId === currentUserId);
      const otherPins = mapPins.filter((pin) => pin.authorId !== currentUserId);

      setPins(ownPins);
      setLoading(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setPins([...ownPins, ...otherPins]);
        timeoutRef.current = null;
      }, FREE_USER_PIN_DELAY_MS);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [
    center?.latitude,
    center?.longitude,
    radiusM,
    profileLoading,
    profile?.isPremium,
    user?.uid,
  ]);

  return { pins, loading, error };
}

export default useMapPins;
