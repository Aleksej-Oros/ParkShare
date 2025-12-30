/**
 * Booking Service
 * Manages parking spot reservations and bookings
 * Handles booking creation, confirmation, cancellation, and status tracking
 */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Booking, BookingStatus } from '@/models/firestore';

const COLLECTION = 'bookings';

/**
 * Create a new booking for a parking spot
 * @param userId - Firebase Auth UID of user making the booking
 * @param spotId - Parking spot ID
 * @param expiresInMinutes - Minutes until booking expires (default: 15)
 * @returns Booking ID
 * @throws Error if validation fails or booking creation fails
 */
export async function createBooking(
  userId: string,
  spotId: string,
  expiresInMinutes: number = 15
): Promise<string> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }

  if (expiresInMinutes < 1 || expiresInMinutes > 60) {
    throw new Error('Booking expiration must be between 1 and 60 minutes');
  }

  // Check if user already has an active booking for this spot
  const existingBooking = await getActiveBookingByUserAndSpot(userId, spotId);
  if (existingBooking) {
    throw new Error('You already have an active booking for this spot');
  }

  const bookedAt = Date.now();
  const expiresAt = bookedAt + expiresInMinutes * 60 * 1000;

  try {
    const bookingData: Omit<Booking, 'id'> = {
      userId,
      spotId,
      status: 'pending',
      bookedAt,
      expiresAt,
    };

    const docRef = await addDoc(collection(firestore, COLLECTION), {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create booking');
  }
}

/**
 * Get booking by ID
 * @param bookingId - Booking document ID
 * @returns Booking object or null if not found
 * @throws Error if fetch fails
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  if (!bookingId || !bookingId.trim()) {
    throw new Error('Booking ID is required');
  }

  try {
    const bookingRef = doc(firestore, COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return null;
    }

    return {
      id: bookingSnap.id,
      ...(bookingSnap.data() as Omit<Booking, 'id'>),
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch booking');
  }
}

/**
 * Get active booking for user and spot
 * @param userId - Firebase Auth UID
 * @param spotId - Parking spot ID
 * @returns Active booking or null
 */
export async function getActiveBookingByUserAndSpot(
  userId: string,
  spotId: string
): Promise<Booking | null> {
  if (!userId || !userId.trim() || !spotId || !spotId.trim()) {
    return null;
  }

  try {
    const q = query(
      collection(firestore, COLLECTION),
      where('userId', '==', userId),
      where('spotId', '==', spotId),
      where('status', 'in', ['pending', 'confirmed']),
      orderBy('bookedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...(doc.data() as Omit<Booking, 'id'>),
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch active booking');
  }
}

/**
 * Confirm a booking
 * Changes status from 'pending' to 'confirmed'
 * @param bookingId - Booking document ID
 * @throws Error if booking not found or confirmation fails
 */
export async function confirmBooking(bookingId: string): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'pending') {
    throw new Error(`Cannot confirm booking with status: ${booking.status}`);
  }

  if (booking.expiresAt < Date.now()) {
    throw new Error('Booking has expired');
  }

  try {
    const bookingRef = doc(firestore, COLLECTION, bookingId);
    await updateDoc(bookingRef, {
      status: 'confirmed',
      confirmedAt: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to confirm booking');
  }
}

/**
 * Complete a booking
 * Marks booking as completed when user successfully parks
 * @param bookingId - Booking document ID
 * @throws Error if booking not found or completion fails
 */
export async function completeBooking(bookingId: string): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'confirmed') {
    throw new Error(`Cannot complete booking with status: ${booking.status}`);
  }

  try {
    const bookingRef = doc(firestore, COLLECTION, bookingId);
    await updateDoc(bookingRef, {
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to complete booking');
  }
}

/**
 * Cancel a booking
 * @param bookingId - Booking document ID
 * @param userId - User ID (for authorization check)
 * @throws Error if booking not found, unauthorized, or cancellation fails
 */
export async function cancelBooking(bookingId: string, userId: string): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.userId !== userId) {
    throw new Error('Unauthorized: You can only cancel your own bookings');
  }

  if (booking.status === 'completed' || booking.status === 'cancelled') {
    throw new Error(`Cannot cancel booking with status: ${booking.status}`);
  }

  try {
    const bookingRef = doc(firestore, COLLECTION, bookingId);
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancelledAt: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to cancel booking');
  }
}

/**
 * Expire a booking
 * Called when booking timer expires
 * @param bookingId - Booking document ID
 * @throws Error if expiration fails
 */
export async function expireBooking(bookingId: string): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'expired') {
    return; // Already in final state
  }

  try {
    const bookingRef = doc(firestore, COLLECTION, bookingId);
    await updateDoc(bookingRef, {
      status: 'expired',
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to expire booking');
  }
}

/**
 * Get all bookings for a user
 * @param userId - Firebase Auth UID
 * @param includeCompleted - Whether to include completed/cancelled bookings (default: true)
 * @returns Array of user's bookings
 */
export async function getUserBookings(
  userId: string,
  includeCompleted: boolean = true
): Promise<Booking[]> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    let q = query(
      collection(firestore, COLLECTION),
      where('userId', '==', userId),
      orderBy('bookedAt', 'desc')
    );

    if (!includeCompleted) {
      q = query(
        collection(firestore, COLLECTION),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'confirmed']),
        orderBy('status'),
        orderBy('bookedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Booking, 'id'>),
    }));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user bookings');
  }
}

/**
 * Get all bookings for a parking spot
 * Useful for spot owners to see who has booked their spot
 * @param spotId - Parking spot ID
 * @returns Array of bookings for the spot
 */
export async function getSpotBookings(spotId: string): Promise<Booking[]> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }

  try {
    const q = query(
      collection(firestore, COLLECTION),
      where('spotId', '==', spotId),
      orderBy('bookedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Booking, 'id'>),
    }));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch spot bookings');
  }
}

/**
 * Check if a spot is currently booked
 * @param spotId - Parking spot ID
 * @returns boolean indicating if spot has active booking
 */
export async function isSpotBooked(spotId: string): Promise<boolean> {
  try {
    const now = Date.now();
    const q = query(
      collection(firestore, COLLECTION),
      where('spotId', '==', spotId),
      where('status', 'in', ['pending', 'confirmed']),
      where('expiresAt', '>', now)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to check booking status');
  }
}

/**
 * Get active bookings count for a user
 * @param userId - Firebase Auth UID
 * @returns Number of active bookings
 */
export async function getActiveBookingsCount(userId: string): Promise<number> {
  try {
    const now = Date.now();
    const q = query(
      collection(firestore, COLLECTION),
      where('userId', '==', userId),
      where('status', 'in', ['pending', 'confirmed']),
      where('expiresAt', '>', now)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to count active bookings');
  }
}

/**
 * Clean up expired bookings (batch operation)
 * Should be called periodically via Cloud Function or scheduled task
 * @param batchSize - Maximum number of bookings to expire (default: 100)
 * @returns Number of bookings expired
 */
export async function cleanupExpiredBookings(batchSize: number = 100): Promise<number> {
  try {
    const now = Date.now();
    const q = query(
      collection(firestore, COLLECTION),
      where('status', 'in', ['pending', 'confirmed']),
      where('expiresAt', '<=', now),
      limit(batchSize)
    );

    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map((docSnap) => expireBooking(docSnap.id));
    await Promise.all(promises);

    return snapshot.size;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to cleanup expired bookings');
  }
}

