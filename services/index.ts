/**
 * Services Index — central export point for active service modules.
 *
 * Architecture:
 * - Reservations: parkingService (parkingSpots.reservation), not bookingService
 * - Premium gating: premiumAccess + users.isPremium, not subscriptions
 * - Profile: hooks/useProfile.realtime.ts
 * - Trust/badges: userService (recalculateReliabilityScore, calculateUnlockedBadges)
 */

export * from './authService';
export * from './userService';
export * from './parkingService';
export * from './premiumAccess';
export * from './subscriptionService';
export * from './paymentService';
export * from './pointsService';
export * from './notificationsService';
export * from './rewardsService';

// Deprecated modules (files kept for reference; do not re-export):
// export * from './parkingSpots';
// export * from './bookingService';

