/**
 * Premium access — single source of truth for runtime gating.
 *
 * PRIMARY (use for all UI / feature gates):
 *   `users/{uid}.isPremium` — read via usePremiumAccess (realtime) or isPremiumActive().
 *
 * METADATA ONLY (not used for gating until IAP + server sync):
 *   `subscriptions/{uid}` — plan, trial, history (subscriptionService).
 *
 * Until RevenueCat is enabled, set `users.isPremium` via Firebase Console or Admin SDK.
 * A future Cloud Function should set `users.isPremium` after validating IAP; subscription
 * docs can be updated in parallel for billing history.
 */

import { getUserById } from '@/services/userService';

/**
 * Resolve premium status from the user profile document (source of truth).
 */
export async function isPremiumActive(userId: string): Promise<boolean> {
  if (!userId || !userId.trim()) {
    return false;
  }
  const user = await getUserById(userId);
  return user?.isPremium === true;
}
