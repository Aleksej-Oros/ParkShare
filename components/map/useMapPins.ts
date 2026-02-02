/**
 * useMapPins Hook
 * Real-time Firestore subscription for parking spots
 * Returns pins formatted for map display
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { listenToNearbySpots } from '@/services/parkingService';
import { ParkingSpot, ParkingSpotReservation, ParkingStatus } from '@/models/firestore';

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
  reservation?: ParkingSpotReservation;
}

const FREE_USER_PIN_DELAY_MS = 30000; // 30 seconds
const PIN_EXPIRY_CHECK_MS = 15000; // 15 seconds

const EXPIRED_STATUSES: ParkingStatus[] = [
  'walk_in_expired',
  'leaving_soon_expired',
  'expired',
];

const isActivePin = (pin: Pick<MapPin, 'expiresAt' | 'status'>, now: number) => {
  if (typeof pin.expiresAt !== 'number' || pin.expiresAt <= now) {
    return false;
  }
  return !EXPIRED_STATUSES.includes(pin.status);
};

export function useMapPins(
  center: { latitude: number; longitude: number } | null,
  radiusM: number = 5000
) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const expiryIntervalRef = useRef<null | ReturnType<typeof setInterval>>(null);

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
      const activeSpots = spots.filter((spot) => isActivePin(spot, now));

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
        reservation: spot.reservation,
      }));

      const currentUserId = user?.uid;
      const filterReservationVisibility = (pinsToFilter: MapPin[]) => {
        const now = Date.now();
        return pinsToFilter.filter((pin) => {
          const reservation = pin.reservation;
          // Approved reservations hide the pin for everyone else until the reservation expires.
          const isApproved =
            reservation?.status === 'approved' &&
            typeof reservation.expiresAt === 'number' &&
            reservation.expiresAt > now;
          if (!isApproved) {
            return true;
          }
          if (!currentUserId) {
            return false;
          }
          return reservation.requesterId === currentUserId || pin.authorId === currentUserId;
        });
      };

      // 3️⃣ DO NOT apply delay until profile is loaded
      if (profileLoading) {
        setPins(filterReservationVisibility(mapPins));
        setLoading(false);
        return;
      }

      const isPremium = profile?.isPremium === true;

      // 4️⃣ Premium users: instant pins
      if (isPremium) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setPins(filterReservationVisibility(mapPins));
        setLoading(false);
        return;
      }

      // 5️⃣ Free users: own pins instant, others delayed
      const ownPins = mapPins.filter((pin) => pin.authorId === currentUserId);
      const otherPins = mapPins.filter((pin) => pin.authorId !== currentUserId);

      setPins(filterReservationVisibility(ownPins));
      setLoading(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setPins(filterReservationVisibility([...ownPins, ...otherPins]));
        timeoutRef.current = null;
      }, FREE_USER_PIN_DELAY_MS);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (expiryIntervalRef.current) {
        clearInterval(expiryIntervalRef.current);
        expiryIntervalRef.current = null;
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

  useEffect(() => {
    if (!center) {
      return;
    }

    if (expiryIntervalRef.current) {
      clearInterval(expiryIntervalRef.current);
    }

    expiryIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setPins((prevPins) => prevPins.filter((pin) => isActivePin(pin, now)));
    }, PIN_EXPIRY_CHECK_MS);

    return () => {
      if (expiryIntervalRef.current) {
        clearInterval(expiryIntervalRef.current);
        expiryIntervalRef.current = null;
      }
    };
  }, [center?.latitude, center?.longitude]);

  return { pins, loading, error };
}

export default useMapPins;
