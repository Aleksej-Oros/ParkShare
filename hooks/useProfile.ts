import { useEffect, useState } from 'react';
import { getUserById } from '@/services/userService';
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

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const userProfile = await getUserById(userId);
        if (!cancelled) {
          setProfile(userProfile ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useProfile]', err);
          setError(err.message ?? 'Failed to load profile');
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    profile,
    loading,
    error,
    isOnboarded: profile?.isOnboarded === true,
  };
};
