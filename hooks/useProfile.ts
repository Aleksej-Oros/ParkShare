/**
 * useProfile: Custom hook to check if user profile exists in Firestore
 * Returns { profile, loading, error } where profile is null if user is not onboarded
 */
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getUserById } from '@/services/userService';
import { User } from '@/models/firestore';

export const useProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to reload profile data from Firestore
  const reloadProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userProfile = await getUserById(user.uid);
      if (userProfile) {
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      console.error('[useProfile] Error reloading profile:', err);
      setError(err.message || 'Failed to reload user profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to be determined
    if (authLoading) {
      return;
    }

    // If no user, no profile
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Check if user profile exists and get it
    reloadProfile();
  }, [user, authLoading]);

  return {
    profile,
    loading: authLoading || loading,
    error,
    // CRITICAL: Only treat as onboarded if explicitly true
    // profile === null OR profile.isOnboarded === undefined MUST be treated as NOT onboarded
    isOnboarded: profile?.isOnboarded === true,
    reloadProfile, // Expose reload function
  };
};

