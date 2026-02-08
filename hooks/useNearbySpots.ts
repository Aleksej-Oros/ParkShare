import { useState, useEffect } from 'react';
import { listenToNearbySpots } from '@/services/parkingService';
import { ParkingSpot } from '@/models/firestore';

/**
 * useNearbySpots subscribes to parkingSpots within a radius of a center point (lat,lng).
 * Returns { spots, loading, error }
 */
export function useNearbySpots(
  center: { latitude: number; longitude: number },
  radiusM: number,
  currentUserId?: string | null
) {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToNearbySpots(center, radiusM, (data) => {
      setSpots(data);
      setLoading(false);
    }, currentUserId);
    return () => unsubscribe();
  }, [center.latitude, center.longitude, radiusM, currentUserId]);

  return { spots, loading, error };
}













