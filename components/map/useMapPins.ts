/**
 * useMapPins Hook
 * Real-time Firestore subscription for parking spots
 * Returns pins formatted for map display
 * Non-premium: each pin created by others is visible only 30s after that pin's creation (per-pin delay).
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';
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

/** Non-premium: each pin created by others becomes visible this long after the pin's creation. */
const FREE_USER_PIN_DELAY_MS = 30000;
const PIN_EXPIRY_CHECK_MS = 15000;

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

/** For free users: own pins + other users' pins that were created at least FREE_USER_PIN_DELAY_MS ago. */
function applyFreeUserDelay(
  pins: MapPin[],
  currentUserId: string | null,
  now: number
): MapPin[] {
  if (!currentUserId) return [];
  return pins.filter((pin) => {
    if (pin.authorId === currentUserId) return true;
    const createdAt = typeof pin.createdAt === 'number' ? pin.createdAt : now;
    return now - createdAt >= FREE_USER_PIN_DELAY_MS;
  });
}

/**
 * Returns the next time (ms since epoch) when a pin will become visible for a free user, or null if none.
 * Used to schedule a single timeout instead of polling every second.
 */
function nextRevealTimeMs(
  pins: MapPin[],
  currentUserId: string | null,
  now: number
): number | null {
  if (!currentUserId) return null;
  let next: number | null = null;
  for (const pin of pins) {
    if (pin.authorId === currentUserId) continue;
    const createdAt = typeof pin.createdAt === 'number' ? pin.createdAt : now;
    const revealAt = createdAt + FREE_USER_PIN_DELAY_MS;
    if (revealAt > now && (next === null || revealAt < next)) {
      next = revealAt;
    }
  }
  return next;
}

export function useMapPins(
  center: { latitude: number; longitude: number } | null,
  radiusM: number = 5000
) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const expiryIntervalRef = useRef<null | ReturnType<typeof setInterval>>(null);
  const nextRevealTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const lastVisiblePinsRef = useRef<MapPin[]>([]);
  const currentUserIdRef = useRef<string | null>(null);
  const isPremiumRef = useRef(false);
  const profileLoadingRef = useRef(true);

  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid || null);

  useEffect(() => {
    if (!center) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    profileLoadingRef.current = profileLoading;
    currentUserIdRef.current = user?.uid ?? null;
    isPremiumRef.current = profile?.isPremium === true;

    const unsubscribe = listenToNearbySpots(center, radiusM, (spots: ParkingSpot[]) => {
      const now = Date.now();

      const activeSpots = spots.filter((spot) => isActivePin(spot, now));
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
        const t = Date.now();
        return pinsToFilter.filter((pin) => {
          const reservation = pin.reservation;
          const isApproved =
            reservation?.status === 'approved' &&
            typeof reservation.expiresAt === 'number' &&
            reservation.expiresAt > t;
          if (!isApproved) return true;
          if (!currentUserId) return false;
          return reservation.requesterId === currentUserId || pin.authorId === currentUserId;
        });
      };

      const visiblePins = filterReservationVisibility(mapPins);
      lastVisiblePinsRef.current = visiblePins;
      profileLoadingRef.current = profileLoading;
      currentUserIdRef.current = currentUserId ?? null;
      isPremiumRef.current = profile?.isPremium === true;

      if (profileLoading) {
        setPins(visiblePins.filter((p) => p.authorId === currentUserId));
        setLoading(false);
        return;
      }

      if (profile?.isPremium === true) {
        setPins(visiblePins);
        setLoading(false);
        return;
      }

      const filtered = applyFreeUserDelay(visiblePins, currentUserId ?? null, now);
      setPins(filtered);
      setLoading(false);
      scheduleNextReveal();
    }, user?.uid);

    function scheduleNextReveal() {
      if (profileLoadingRef.current || isPremiumRef.current) return;
      const visible = lastVisiblePinsRef.current;
      const now = Date.now();
      const next = nextRevealTimeMs(visible, currentUserIdRef.current, now);
      if (nextRevealTimeoutRef.current) {
        clearTimeout(nextRevealTimeoutRef.current);
        nextRevealTimeoutRef.current = null;
      }
      if (next !== null) {
        const delay = Math.min(next - now, 2147483647);
        if (delay > 0) {
          nextRevealTimeoutRef.current = setTimeout(() => {
            nextRevealTimeoutRef.current = null;
            const visible2 = lastVisiblePinsRef.current;
            const now2 = Date.now();
            setPins(applyFreeUserDelay(visible2, currentUserIdRef.current, now2));
            scheduleNextReveal();
          }, delay);
        }
      }
    }

    return () => {
      if (nextRevealTimeoutRef.current) {
        clearTimeout(nextRevealTimeoutRef.current);
        nextRevealTimeoutRef.current = null;
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
