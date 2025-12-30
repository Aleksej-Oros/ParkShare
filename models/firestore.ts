// Firestore Data Models for ParkShare MVP
// Use these TypeScript interfaces for type safety with Firestore

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

