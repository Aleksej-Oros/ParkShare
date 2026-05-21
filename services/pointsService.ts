/**
 * Points Service — Park Points, levels, priority score helpers.
 *
 * Trust / reliability / badges: use userService (recalculateReliabilityScore,
 * calculateUnlockedBadges, updateReliabilityScoreIfNeeded). Do not add parallel logic here.
 */

import { doc, getDoc, updateDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { getUserById, calculateUnlockedBadges } from '@/services/userService';

const USERS_COLLECTION = 'users';

/**
 * Award points to user
 * Applies premium multiplier if user is premium
 * @param userId - Firebase Auth UID
 * @param basePoints - Base points to award
 * @param isPremium - Whether user has premium (for multiplier)
 * @param multiplier - Premium multiplier (default: 2x for premium, 1x for free)
 * @throws Error if user not found or update fails
 */
export async function awardPoints(
  userId: string,
  basePoints: number,
  isPremium: boolean = false,
  multiplier: number = 2
): Promise<number> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (basePoints < 0) {
    throw new Error('Points cannot be negative');
  }

  if (multiplier < 1) {
    throw new Error('Multiplier must be at least 1');
  }

  // Calculate final points
  const finalPoints = isPremium ? Math.floor(basePoints * multiplier) : basePoints;

  try {
    const userRef = doc(firestore, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    await updateDoc(userRef, {
      parkPoints: increment(finalPoints),
      updatedAt: serverTimestamp(),
    });

    return finalPoints;
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to award points');
  }
}

/**
 * Award points for verified pin creation
 * Premium users get 2x or 3x multiplier
 * @param userId - Firebase Auth UID
 * @param isPremium - Whether user has premium
 * @param multiplier - Premium multiplier (default: 2, can be 3 for special events)
 * @returns Points awarded
 */
export async function awardPointsForVerifiedPin(
  userId: string,
  isPremium: boolean = false,
  multiplier: number = 2
): Promise<number> {
  const basePoints = 10; // Base reward for verified pin
  return await awardPoints(userId, basePoints, isPremium, multiplier);
}

/**
 * Award points for successful parking confirmation
 * Smaller reward than pin creation
 * @param userId - Firebase Auth UID
 * @param isPremium - Whether user has premium
 * @returns Points awarded
 */
export async function awardPointsForParkingConfirmation(
  userId: string,
  isPremium: boolean = false
): Promise<number> {
  const basePoints = 5; // Smaller reward for confirming parking
  return await awardPoints(userId, basePoints, isPremium, 2);
}

/**
 * Get user's current points
 * @param userId - Firebase Auth UID
 * @returns Current park points
 * @throws Error if user not found
 */
export async function getUserPoints(userId: string): Promise<number> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user.parkPoints;
}

/**
 * Atomically add points to user profile.
 * @param uid - user id
 * @param points - amount to add
 * @param reason - string (for audit/log, not yet used)
 * @throws Error
 */
export async function addPointsToUser(uid: string, points: number, reason?: string): Promise<void> {
  if (!uid || typeof points !== 'number') throw new Error('Invalid arguments');
  const userRef = doc(firestore, USERS_COLLECTION, uid);
  await runTransaction(firestore, async (trx) => {
    const snap = await trx.get(userRef);
    if (!snap.exists()) throw new Error('User not found');
    const prev = snap.data();
    const newPoints = (prev.parkPoints || 0) + points;
    trx.update(userRef, { parkPoints: newPoints, updatedAt: serverTimestamp() });
    // Optionally, store a log with `reason` in the future for audit
  });
}

/**
 * Calculate user level based on points
 * Levels increase exponentially
 * @param points - User's total points
 * @returns Level number (starts at 1)
 */
export function calculateLevel(points: number): number {
  if (points < 0) {
    return 1;
  }

  // Level formula: level = floor(sqrt(points / 100)) + 1
  // Level 1: 0-99 points
  // Level 2: 100-399 points
  // Level 3: 400-899 points
  // Level 4: 900-1599 points
  // etc.
  return Math.floor(Math.sqrt(points / 100)) + 1;
}

/**
 * Get points required for next level
 * @param currentLevel - Current user level
 * @returns Points required to reach next level
 */
export function getPointsForNextLevel(currentLevel: number): number {
  if (currentLevel < 1) {
    return 100;
  }

  // Points for level N = (N-1)^2 * 100
  const nextLevel = currentLevel + 1;
  return (nextLevel - 1) ** 2 * 100;
}

/**
 * Get points progress to next level
 * @param currentPoints - User's current points
 * @returns Object with current level, points in current level, and points needed for next level
 */
export function getLevelProgress(currentPoints: number): {
  level: number;
  pointsInCurrentLevel: number;
  pointsForNextLevel: number;
  progressPercentage: number;
} {
  const level = calculateLevel(currentPoints);
  const pointsForCurrentLevel = level > 1 ? (level - 1) ** 2 * 100 : 0;
  const pointsForNextLevel = getPointsForNextLevel(level);
  const pointsInCurrentLevel = currentPoints - pointsForCurrentLevel;
  const progressPercentage = Math.min(
    (pointsInCurrentLevel / (pointsForNextLevel - pointsForCurrentLevel)) * 100,
    100
  );

  return {
    level,
    pointsInCurrentLevel,
    pointsForNextLevel,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
  };
}

/**
 * @deprecated Use userService.updateReliabilityScoreIfNeeded (counter-based formula).
 * Per-event +/- scoring is not used in production flows.
 */
export async function updateReliabilityScore(
  userId: string,
  _isSuccess: boolean
): Promise<void> {
  console.warn(
    '[pointsService] updateReliabilityScore is deprecated; use userService.updateReliabilityScoreIfNeeded'
  );
  const { updateReliabilityScoreIfNeeded } = await import('@/services/userService');
  await updateReliabilityScoreIfNeeded(userId);
}

/**
 * Calculate priority score for parking spot
 * Based on user reliability, premium status, and pin type
 * @param userReliabilityScore - User's reliability score (0-100)
 * @param isPremium - Whether user has premium
 * @param pinType - Type of pin ('walk-in' or 'leaving-soon')
 * @returns Priority score (higher = more priority)
 */
export function calculatePriorityScore(
  userReliabilityScore: number,
  isPremium: boolean,
  pinType: 'walk-in' | 'leaving-soon'
): number {
  let score = userReliabilityScore;

  // Premium users get +20 boost
  if (isPremium) {
    score += 20;
  }

  // Leaving-soon pins are more valuable, get +15 boost
  if (pinType === 'leaving-soon') {
    score += 15;
  }

  return Math.min(score, 150); // Cap at 150
}

/**
 * @deprecated Use userService.calculateUnlockedBadges / updateBadgesIfNeeded.
 * Badge IDs: trusted-source, active-driver, early-adopter (see userService).
 */
export async function checkBadgeEligibility(
  userId: string,
  badgeName: string
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) {
    return false;
  }
  if ((user.badges || []).includes(badgeName)) {
    return true;
  }
  return calculateUnlockedBadges(user).includes(badgeName);
}

