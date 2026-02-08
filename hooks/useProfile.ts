import { useEffect, useRef, useState } from 'react';
import { getUserById } from '@/services/userService';
import { getUserMonthlyStats } from '@/services/rewardsService';
import { reconcileUserExpiredPins } from '@/services/parkingService';
import { User } from '@/models/firestore';

export const useProfile = (userId: string | null) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconciledUserIdRef = useRef<string | null>(null);

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
        if (reconciledUserIdRef.current !== userId) {
          reconciledUserIdRef.current = userId;
          await reconcileUserExpiredPins(userId);
        }
        const userProfile = await getUserById(userId);
        const monthlyStats = await getUserMonthlyStats(userId);
        if (!cancelled) {
          if (userProfile) {
            setProfile({
              ...userProfile,
              leavingSoonSharesThisMonth:
                monthlyStats?.leavingSoonCount ?? userProfile.leavingSoonSharesThisMonth ?? 0,
            });
          } else {
            setProfile(null);
          }
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
