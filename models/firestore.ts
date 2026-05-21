// Firestore Data Models for ParkShare MVP
// Use these TypeScript interfaces for type safety with Firestore
import type { Timestamp } from 'firebase/firestore';

/**
 * users collection
 */
export interface User {
  id: string; // matches firebase uid
  displayName: string;
  rating: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  parkPoints: number; // gamification
  reliabilityScore: number;
  badges: string[];
  isTester: boolean;
  isPremium: boolean;
  isActive: boolean; // for soft-deletes or disabling users
  isOnboarded: boolean; // true if user has completed onboarding
  rewardEligibleNextMonth?: boolean;
  leavingSoonSharesThisMonth?: number;
  /** Earned by sharing SHARING_REWARD_TARGET Leaving Soon spots in a month; valid until expiresAt. Applied at checkout or via SHARING_REWARD_CODE. */
  sharingRewardDiscount?: {
    percent: number;
    expiresAt: number;
    code: string;
  };

  // --- Trust Metrics Phase 2A (Optional) ---
  pinsCreated?: number;
  pinsVerified?: number;
  pinsExpired?: number;
  lastActivityAt?: number;
}

/**
 * parkingSpots collection
 */
export type PinType = 'walk-in' | 'leaving-soon';
export type ParkingStatus = 
  | 'potentially-free' 
  | 'verified' 
  | 'expired' 
  | 'occupied'
  | 'walk_in_pending'
  | 'walk_in_expired'
  | 'leaving_soon_active'
  | 'leaving_soon_expired';

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/** Embedded reservation on parkingSpots — production reservation model (see parkingService). */
export interface ParkingSpotReservation {
  status: ReservationStatus;
  requesterId: string;
  requestedAt: number;
  approvedAt?: number;
  expiresAt?: number; // approvedAt + 5 minutes
}

export interface ParkingSpot {
  id: string;
  userId: string; // author
  location: {
    latitude: number;
    longitude: number;
  };
  pinType: PinType;
  willLeaveIn?: number; // minutes (only for 'leaving-soon')
  isPaid: boolean;
  status: ParkingStatus;
  expiresAt: number; // timestamp (ms)
  createdAt: number; // timestamp (ms)
  priorityScore: number; // computed via gamification
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  // Additional fields for pin creation form
  title?: string;
  description?: string;
  reservation?: ParkingSpotReservation;
}

/**
 * parkHistory collection
 */
export interface ParkHistory {
  userId: string;
  spotId: string;
  confirmedAt: number; // timestamp
  ratingGiven?: number;
}

/**
 * subscriptions collection
 */
export interface Subscription {
  userId: string;
  plan: 'free' | 'monthly' | 'yearly';
  trialEndsAt: number; // timestamp
  isActive: boolean;
}

/**
 * bookings collection
 * @deprecated Unused. Production reservations use ParkingSpot.reservation on parkingSpots.
 */
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';

export interface Booking {
  id: string;
  userId: string; // User who booked the spot
  spotId: string; // Parking spot ID
  status: BookingStatus;
  bookedAt: number; // Timestamp when booking was created
  expiresAt: number; // Timestamp when booking expires
  confirmedAt?: number; // Timestamp when booking was confirmed
  cancelledAt?: number; // Timestamp when booking was cancelled
  completedAt?: number; // Timestamp when parking was completed
}

/**
 * userMonthlyStats collection
 */
export interface UserMonthlyStats {
  userId: string;
  yearMonth: string; // "YYYY_MM"
  leavingSoonCount: number;
  completedPinIds: string[];
  rewardUnlocked: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
