/**
 * useAddressSearch Hook
 * Manages address search state and debounced API calls
 * Provides search results and loading/error states
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchAddresses, GeocodingResult, GeocodingError } from '@/services/geocodingService';

export interface AddressSearchState {
  /** Current search query */
  query: string;
  /** Search results */
  results: GeocodingResult[];
  /** Loading state */
  loading: boolean;
  /** Error message if search fails */
  error: string | null;
}

/**
 * Hook for managing address search
 * @param debounceMs - Debounce delay in milliseconds (default: 400ms)
 * @returns Search state and functions to search/clear
 */
export function useAddressSearch(debounceMs: number = 400) {
  const [state, setState] = useState<AddressSearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform address search with debouncing
   */
  const search = useCallback(
    async (query: string) => {
      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Update query immediately
      setState((prev) => ({
        ...prev,
        query,
      }));

      // If query is empty, clear results
      if (!query || query.trim().length === 0) {
        setState({
          query: '',
          results: [],
          loading: false,
          error: null,
        });
        return;
      }

      // Debounce the API call
      debounceTimerRef.current = setTimeout(async () => {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        try {
          const results = await searchAddresses(query.trim(), 10);

          // Check if request was aborted
          if (abortControllerRef.current.signal.aborted) {
            return;
          }

          setState({
            query,
            results,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          // Check if request was aborted
          if (abortControllerRef.current.signal.aborted) {
            return;
          }

          const geocodingError = error as GeocodingError;
          setState({
            query,
            results: [],
            loading: false,
            error: geocodingError.message || 'Failed to search addresses',
          });
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  /**
   * Clear search results and reset state
   */
  const clear = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Cancel ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      query: '',
      results: [],
      loading: false,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    search,
    clear,
  };
}
