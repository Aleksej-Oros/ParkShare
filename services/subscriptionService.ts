/**
 * Subscription Service
 * Manages user subscriptions, trials, and premium status
 * Integrates with RevenueCat for payment processing
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Subscription } from '@/models/firestore';

const COLLECTION = 'subscriptions';

/**
 * Create a new subscription document
 * Called when user starts a trial or purchases premium
 * @param userId - Firebase Auth UID
 * @param subscriptionData - Subscription data
 * @throws Error if subscription already exists or creation fails
 */
export async function createSubscription(
  userId: string,
  subscriptionData: Omit<Subscription, 'userId'>
): Promise<void> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (!subscriptionData.plan || !['free', 'monthly', 'yearly'].includes(subscriptionData.plan)) {
    throw new Error('Invalid subscription plan');
  }

  if (subscriptionData.trialEndsAt && subscriptionData.trialEndsAt < Date.now()) {
    throw new Error('Trial end date must be in the future');
  }

  // Check if subscription already exists
  const subRef = doc(firestore, COLLECTION, userId);
  const subSnap = await getDoc(subRef);

  if (subSnap.exists()) {
    throw new Error('Subscription already exists for this user');
  }

  try {
    await setDoc(subRef, {
      userId,
      ...subscriptionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create subscription');
  }
}

/**
 * Get user's subscription
 * @param userId - Firebase Auth UID
 * @returns Subscription object or null if not found
 * @throws Error if fetch fails
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    const subRef = doc(firestore, COLLECTION, userId);
    const subSnap = await getDoc(subRef);

    if (!subSnap.exists()) {
      return null;
    }

    return subSnap.data() as Subscription;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch subscription');
  }
}

/**
 * Update subscription
 * Used for plan changes, trial extensions, activation/deactivation
 * @param userId - Firebase Auth UID
 * @param updates - Partial subscription data to update
 * @throws Error if subscription not found or update fails
 */
export async function updateSubscription(
  userId: string,
  updates: Partial<Omit<Subscription, 'userId'>>
): Promise<void> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (updates.plan && !['free', 'monthly', 'yearly'].includes(updates.plan)) {
    throw new Error('Invalid subscription plan');
  }

  if (updates.trialEndsAt && updates.trialEndsAt < Date.now()) {
    throw new Error('Trial end date must be in the future');
  }

  try {
    const subRef = doc(firestore, COLLECTION, userId);
    const subSnap = await getDoc(subRef);

    if (!subSnap.exists()) {
      throw new Error('Subscription not found');
    }

    await updateDoc(subRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to update subscription');
  }
}

/**
 * Start free trial for user
 * Creates subscription with 30-day trial
 * @param userId - Firebase Auth UID
 * @throws Error if subscription already exists or creation fails
 */
export async function startFreeTrial(userId: string): Promise<void> {
  const trialEndsAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now

  await createSubscription(userId, {
    plan: 'free',
    trialEndsAt,
    isActive: true,
  });
}

/**
 * Activate premium subscription
 * Called after successful RevenueCat purchase
 * @param userId - Firebase Auth UID
 * @param plan - Subscription plan ('monthly' or 'yearly')
 * @throws Error if activation fails
 */
export async function activatePremium(userId: string, plan: 'monthly' | 'yearly'): Promise<void> {
  if (!['monthly', 'yearly'].includes(plan)) {
    throw new Error('Invalid premium plan');
  }

  const subscription = await getSubscription(userId);

  if (subscription) {
    // Update existing subscription
    await updateSubscription(userId, {
      plan,
      isActive: true,
      trialEndsAt: subscription.trialEndsAt, // Keep trial end date if still in trial
    });
  } else {
    // Create new subscription
    await createSubscription(userId, {
      plan,
      trialEndsAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30-day trial
      isActive: true,
    });
  }
}

/**
 * Cancel subscription
 * Sets isActive to false
 * @param userId - Firebase Auth UID
 * @throws Error if cancellation fails
 */
export async function cancelSubscription(userId: string): Promise<void> {
  await updateSubscription(userId, {
    isActive: false,
  });
}

/**
 * Check if user has active premium subscription
 * Considers trial period and active status
 * @param userId - Firebase Auth UID
 * @returns boolean indicating premium status
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);

  if (!subscription) {
    return false;
  }

  if (!subscription.isActive) {
    return false;
  }

  // Check if user is in trial period
  if (subscription.trialEndsAt && subscription.trialEndsAt > Date.now()) {
    return true; // User is in trial, consider as premium
  }

  // Check if user has paid plan
  return subscription.plan === 'monthly' || subscription.plan === 'yearly';
}

/**
 * Check if user is in trial period
 * @param userId - Firebase Auth UID
 * @returns boolean indicating trial status
 */
export async function isUserInTrial(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);

  if (!subscription) {
    return false;
  }

  return subscription.trialEndsAt ? subscription.trialEndsAt > Date.now() : false;
}

/**
 * Get days remaining in trial
 * @param userId - Firebase Auth UID
 * @returns Number of days remaining (0 if not in trial)
 */
export async function getTrialDaysRemaining(userId: string): Promise<number> {
  const subscription = await getSubscription(userId);

  if (!subscription || !subscription.trialEndsAt) {
    return 0;
  }

  const now = Date.now();
  if (subscription.trialEndsAt <= now) {
    return 0;
  }

  const msRemaining = subscription.trialEndsAt - now;
  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}

/**
 * Set user as tester (unlimited premium access)
 * @param userId - Firebase Auth UID
 * @throws Error if update fails
 */
export async function setTesterStatus(userId: string, isTester: boolean): Promise<void> {
  // This would typically update the user document, but for consistency
  // we can also store it in subscription
  const subscription = await getSubscription(userId);

  if (subscription) {
    await updateSubscription(userId, {
      isActive: isTester, // Testers have active subscription
    });
  } else if (isTester) {
    // Create subscription for tester
    await createSubscription(userId, {
      plan: 'yearly', // Testers get yearly plan equivalent
      trialEndsAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      isActive: true,
    });
  }
}

