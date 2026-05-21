/**
 * Profile hook — production source of truth for user profile state.
 *
 * Realtime Firestore listener on `users/{uid}` (onboarding, AuthGuard, premium, rewards UI).
 * Runs one-time expired-pin reconciliation per session to keep monthly sharing stats in sync.
 */
import { useEffect, useRef, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { User } from '@/models/firestore';
import { reconcileUserExpiredPins } from '@/services/parkingService';

export const useProfile = (userId: string | null) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconciledUserIdRef = useRef<string | null>(null);

  // Catch up rewards for pins that expired while the app was closed (no UI change).
  useEffect(() => {
    if (!userId) {
      return;
    }
    if (reconciledUserIdRef.current === userId) {
      return;
    }
    reconciledUserIdRef.current = userId;
    reconcileUserExpiredPins(userId).catch((err) => {
      console.warn('[useProfile] reconcileUserExpiredPins failed', err);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const docRef = doc(firestore, 'users', userId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as User) : null);
        setLoading(false);
      },
      (err) => {
        // Gracefully handle known transient offline/init errors
        if (err.message && err.message.includes('offline')) {
          // Optionally, display a toast or UI status: 'You are offline'
          setError(null);
        } else {
          setError(err.message || 'Failed to listen to profile');
        }
        setProfile(null);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  return {
    profile,
    loading,
    error,
    isOnboarded: profile?.isOnboarded === true,
  };
};
