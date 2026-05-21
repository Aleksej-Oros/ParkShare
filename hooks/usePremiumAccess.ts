/**
 * usePremiumAccess — UI premium gating (map, reservations, routes, profile badge).
 *
 * Source of truth: `users.isPremium` on the realtime profile (see services/premiumAccess.ts).
 * Do not gate features on `subscriptions` or subscriptionService.isUserPremium.
 */
import { useAuth } from './useAuth';
import { useProfile } from './useProfile.realtime';

export interface PremiumAccessResult {
  /** True if user has premium status (isPremium === true) */
  isPremium: boolean;
  /** True if premium status is still loading */
  loading: boolean;
  /** Current user ID (null if not authenticated) */
  userId: string | null;
}

/**
 * Check if current user has premium access
 * Uses already-loaded profile data (no additional Firestore calls)
 * 
 * @returns PremiumAccessResult with isPremium, loading, and userId
 */
export function usePremiumAccess(): PremiumAccessResult {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid || null);

  // Premium status is determined by profile?.isPremium === true
  // Missing or undefined is treated as free user
  const isPremium = profile?.isPremium === true;

  return {
    isPremium,
    loading: profileLoading,
    userId: user?.uid || null,
  };
}
