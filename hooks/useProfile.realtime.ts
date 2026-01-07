import { useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { User } from '@/models/firestore';

export const useProfile = (userId: string | null) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
