/**
 * useFavouriteLocations Hook
 * Manages favourite locations stored locally
 * No limit, but reasonable soft limit of 20
 * User-specific: each user has their own favourite locations
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationItem } from './useRecentSearches';
import { useAuth } from './useAuth';

const FAVOURITE_LOCATIONS_KEY_PREFIX = '@parkshare:favourite_locations:';
const SOFT_LIMIT = 20;

/**
 * Hook for managing favourite locations
 * @returns Favourite locations state and functions to manage them
 */
export function useFavouriteLocations() {
  const { user } = useAuth();
  const [favouriteLocations, setFavouriteLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    if (!user?.uid) {
      return null;
    }
    return `${FAVOURITE_LOCATIONS_KEY_PREFIX}${user.uid}`;
  }, [user?.uid]);

  // Load favourite locations from storage
  useEffect(() => {
    const loadFavouriteLocations = async () => {
      if (!user?.uid) {
        setFavouriteLocations([]);
        setLoading(false);
        return;
      }

      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          setFavouriteLocations([]);
          setLoading(false);
          return;
        }

        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavouriteLocations(Array.isArray(parsed) ? parsed : []);
        } else {
          setFavouriteLocations([]);
        }
      } catch (error) {
        console.error('[useFavouriteLocations] Error loading favourites:', error);
        setFavouriteLocations([]);
      } finally {
        setLoading(false);
      }
    };

    loadFavouriteLocations();
  }, [user?.uid, getStorageKey]);

  /**
   * Check if a location is favourited
   */
  const isFavourite = useCallback(
    (latitude: number, longitude: number): boolean => {
      return favouriteLocations.some(
        (item) =>
          Math.abs(item.latitude - latitude) < 0.0001 &&
          Math.abs(item.longitude - longitude) < 0.0001
      );
    },
    [favouriteLocations]
  );

  /**
   * Get favourite item by coordinates
   */
  const getFavouriteItem = useCallback(
    (latitude: number, longitude: number): LocationItem | undefined => {
      return favouriteLocations.find(
        (item) =>
          Math.abs(item.latitude - latitude) < 0.0001 &&
          Math.abs(item.longitude - longitude) < 0.0001
      );
    },
    [favouriteLocations]
  );

  /**
   * Add a location to favourites
   */
  const addFavourite = useCallback(
    async (location: LocationItem) => {
      if (!user?.uid) {
        return;
      }

      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          return;
        }

        // Check if already favourited
        if (isFavourite(location.latitude, location.longitude)) {
          return;
        }

        // Warn if approaching soft limit
        if (favouriteLocations.length >= SOFT_LIMIT) {
          console.warn(
            `[useFavouriteLocations] Soft limit of ${SOFT_LIMIT} favourites reached`
          );
        }

        setFavouriteLocations((prev) => {
          const newItem: LocationItem = {
            ...location,
            createdAt: Date.now(),
          };
          const updated = [...prev, newItem];

          // Save to storage
          AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(
            (error) => {
              console.error('[useFavouriteLocations] Error saving favourites:', error);
            }
          );

          return updated;
        });
      } catch (error) {
        console.error('[useFavouriteLocations] Error adding favourite:', error);
      }
    },
    [user?.uid, getStorageKey, favouriteLocations.length, isFavourite]
  );

  /**
   * Remove a location from favourites
   */
  const removeFavourite = useCallback(
    async (latitude: number, longitude: number) => {
      if (!user?.uid) {
        return;
      }

      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          return;
        }

        setFavouriteLocations((prev) => {
          const updated = prev.filter(
            (item) =>
              !(
                Math.abs(item.latitude - latitude) < 0.0001 &&
                Math.abs(item.longitude - longitude) < 0.0001
              )
          );

          // Save to storage
          AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(
            (error) => {
              console.error('[useFavouriteLocations] Error saving favourites:', error);
            }
          );

          return updated;
        });
      } catch (error) {
        console.error('[useFavouriteLocations] Error removing favourite:', error);
      }
    },
    [user?.uid, getStorageKey]
  );

  /**
   * Toggle favourite state
   */
  const toggleFavourite = useCallback(
    async (location: LocationItem) => {
      if (isFavourite(location.latitude, location.longitude)) {
        await removeFavourite(location.latitude, location.longitude);
      } else {
        await addFavourite(location);
      }
    },
    [isFavourite, addFavourite, removeFavourite]
  );

  return {
    favouriteLocations,
    loading,
    isFavourite,
    getFavouriteItem,
    addFavourite,
    removeFavourite,
    toggleFavourite,
  };
}
