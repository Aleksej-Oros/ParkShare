/**
 * useRecentSearches Hook
 * Manages recent search locations stored locally
 * Stores up to 10 recent items, removes duplicates (moves to top)
 * User-specific: each user has their own recent searches
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

export interface LocationItem {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timestamp?: number;
  createdAt?: number;
}

const RECENT_SEARCHES_KEY_PREFIX = '@parkshare:recent_searches:';
const MAX_RECENT_SEARCHES = 10;

/**
 * Hook for managing recent search locations
 * @returns Recent searches state and functions to manage them
 */
export function useRecentSearches() {
  const { user } = useAuth();
  const [recentSearches, setRecentSearches] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    if (!user?.uid) {
      return null;
    }
    return `${RECENT_SEARCHES_KEY_PREFIX}${user.uid}`;
  }, [user?.uid]);

  // Load recent searches from storage
  useEffect(() => {
    const loadRecentSearches = async () => {
      if (!user?.uid) {
        setRecentSearches([]);
        setLoading(false);
        return;
      }

      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          setRecentSearches([]);
          setLoading(false);
          return;
        }

        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentSearches(Array.isArray(parsed) ? parsed : []);
        } else {
          setRecentSearches([]);
        }
      } catch (error) {
        console.error('[useRecentSearches] Error loading recent searches:', error);
        setRecentSearches([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentSearches();
  }, [user?.uid, getStorageKey]);

  /**
   * Add a location to recent searches
   * If duplicate exists, moves it to top
   * Maintains max 10 items (FIFO)
   */
  const addRecentSearch = useCallback(
    async (location: LocationItem) => {
      if (!user?.uid) {
        return;
      }

      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          return;
        }

        setRecentSearches((prev) => {
          // Remove duplicate if exists (based on lat/lng)
          const filtered = prev.filter(
            (item) =>
              !(
                Math.abs(item.latitude - location.latitude) < 0.0001 &&
                Math.abs(item.longitude - location.longitude) < 0.0001
              )
          );

          // Add new item to top with timestamp
          const newItem: LocationItem = {
            ...location,
            timestamp: Date.now(),
          };

          // Keep max 10 items (FIFO)
          const updated = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES);

          // Save to storage
          AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(
            (error) => {
              console.error('[useRecentSearches] Error saving recent searches:', error);
            }
          );

          return updated;
        });
      } catch (error) {
        console.error('[useRecentSearches] Error adding recent search:', error);
      }
    },
    [user?.uid, getStorageKey]
  );

  /**
   * Clear all recent searches
   */
  const clearRecentSearches = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    try {
      const storageKey = getStorageKey();
      if (!storageKey) {
        return;
      }

      await AsyncStorage.removeItem(storageKey);
      setRecentSearches([]);
    } catch (error) {
      console.error('[useRecentSearches] Error clearing recent searches:', error);
    }
  }, [user?.uid, getStorageKey]);

  /**
   * Remove a specific recent search
   */
  const removeRecentSearch = useCallback(
    async (id: string) => {
      if (!user?.uid) {
        return;
      }

      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          return;
        }

        setRecentSearches((prev) => {
          const updated = prev.filter((item) => item.id !== id);
          AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(
            (error) => {
              console.error('[useRecentSearches] Error saving recent searches:', error);
            }
          );
          return updated;
        });
      } catch (error) {
        console.error('[useRecentSearches] Error removing recent search:', error);
      }
    },
    [user?.uid, getStorageKey]
  );

  return {
    recentSearches,
    loading,
    addRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
  };
}
