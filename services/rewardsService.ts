/**
 * Rewards Service — monthly leaving-soon sharing rewards (userMonthlyStats + user fields).
 * Independent of reservations; reservation flow is parkingService + parkingSpots.reservation.
 */

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { ParkingSpot } from '@/models/firestore';
import {
  SHARING_REWARD_TARGET,
  SHARING_REWARD_DISCOUNT_PERCENT,
  SHARING_REWARD_CODE,
} from '@/config/rewardsConfig';

const USER_MONTHLY_STATS_COLLECTION = 'userMonthlyStats';
const USERS_COLLECTION = 'users';

const formatYearMonth = (timestampMs: number) => {
  const date = new Date(timestampMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}_${month}`;
};

export async function getUserMonthlyStats(
  userId: string,
  dateMs: number = Date.now()
): Promise<{
  leavingSoonCount: number;
  rewardUnlocked: boolean;
} | null> {
  if (!userId || !userId.trim()) {
    return null;
  }

  const yearMonth = formatYearMonth(dateMs);
  const statsDocId = `${userId}_${yearMonth}`;
  const statsRef = doc(firestore, USER_MONTHLY_STATS_COLLECTION, statsDocId);
  const snap = await getDoc(statsRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  return {
    leavingSoonCount:
      typeof data.leavingSoonCount === 'number' ? data.leavingSoonCount : 0,
    rewardUnlocked: data.rewardUnlocked === true,
  };
}

/**
 * Track a leaving-soon pin that expired naturally.
 * TODO: Move to Cloud Function for trusted server-side updates.
 */
export async function trackLeavingSoonCompletion(spot: ParkingSpot): Promise<void> {
  if (!spot || !spot.userId || !spot.id) {
    return;
  }

  if (spot.pinType !== 'leaving-soon') {
    return;
  }

  const expiresAt = typeof spot.expiresAt === 'number' ? spot.expiresAt : null;
  if (!expiresAt || expiresAt > Date.now()) {
    return;
  }

  if (!['expired', 'leaving_soon_expired'].includes(spot.status)) {
    return;
  }

  const yearMonth = formatYearMonth(expiresAt);
  const currentYearMonth = formatYearMonth(Date.now());
  const statsDocId = `${spot.userId}_${yearMonth}`;
  const statsRef = doc(firestore, USER_MONTHLY_STATS_COLLECTION, statsDocId);
  const userRef = doc(firestore, USERS_COLLECTION, spot.userId);

  await runTransaction(firestore, async (trx) => {
    const [statsSnap, userSnap] = await Promise.all([
      trx.get(statsRef),
      trx.get(userRef),
    ]);

    const statsData = statsSnap.exists() ? statsSnap.data() : null;
    const completedPinIds = Array.isArray(statsData?.completedPinIds)
      ? statsData?.completedPinIds
      : [];

    if (completedPinIds.includes(spot.id)) {
      return;
    }

    const currentCount =
      typeof statsData?.leavingSoonCount === 'number' ? statsData?.leavingSoonCount : 0;
    const newCount = currentCount + 1;
    const rewardUnlocked = newCount >= SHARING_REWARD_TARGET;

    const userData = userSnap.exists() ? userSnap.data() : null;
    const isPremium =
      userData?.isPremium === true ||
      userData?.isPremium === 'true' ||
      userData?.isPremium === 1;

    const shouldSetRewardEligible =
      rewardUnlocked && isPremium && userData?.rewardEligibleNextMonth !== true;

    // Grant 30% discount for next month(s) to any user who hits target (industry-standard eligibility + code).
    const now = Date.now();
    const endOfNextMonth = new Date(now);
    endOfNextMonth.setUTCMonth(endOfNextMonth.getUTCMonth() + 2, 0);
    endOfNextMonth.setUTCHours(23, 59, 59, 999);
    const expiresAt = endOfNextMonth.getTime();
    const shouldSetSharingDiscount =
      rewardUnlocked &&
      (!userData?.sharingRewardDiscount || (userData.sharingRewardDiscount as { expiresAt?: number })?.expiresAt < now);

    const statsPayload = {
      userId: spot.userId,
      yearMonth,
      leavingSoonCount: newCount,
      completedPinIds: [...completedPinIds, spot.id],
      rewardUnlocked,
      updatedAt: serverTimestamp(),
    };

    if (statsSnap.exists()) {
      trx.update(statsRef, statsPayload);
    } else {
      trx.set(statsRef, {
        ...statsPayload,
        createdAt: serverTimestamp(),
      });
    }

    const userUpdatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (yearMonth === currentYearMonth) {
      userUpdatePayload.leavingSoonSharesThisMonth = newCount;
    }

    if (shouldSetRewardEligible) {
      userUpdatePayload.rewardEligibleNextMonth = true;
    }

    if (shouldSetSharingDiscount) {
      userUpdatePayload.sharingRewardDiscount = {
        percent: SHARING_REWARD_DISCOUNT_PERCENT,
        expiresAt,
        code: SHARING_REWARD_CODE,
      };
    }

    if (userSnap.exists() && Object.keys(userUpdatePayload).length > 1) {
      trx.update(userRef, userUpdatePayload);
    }
  });
}
