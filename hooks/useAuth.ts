// useAuth: Custom hook to sync Firebase auth state with Redux
// Returns { user, loading, errorMessage } where user is null when not authenticated
// CRITICAL: Must properly track initialization to prevent premature navigation
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { setUser } from '@/features/auth/authSlice';
import { AppDispatch, RootState } from '@/store';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, errorMessage } = useSelector((state: RootState) => state.auth);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (isMounted) {
          console.log('[useAuth] Auth state changed:', firebaseUser ? 'authenticated' : 'unauthenticated');
          dispatch(setUser(firebaseUser));
          setInitializing(false);
        }
      },
      (error) => {
        if (isMounted) {
          console.error('[useAuth] Auth state error:', error);
          dispatch(setUser(null));
          setInitializing(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dispatch]);

  // Return loading state until Firebase auth is initialized
  // CRITICAL: Must return true during initialization to prevent Stack from rendering
  const isLoading = initializing || loading;

  return { 
    user: user || null, // Ensure user is always null when not authenticated (no stubbed data)
    loading: isLoading, 
    errorMessage 
  };
};

