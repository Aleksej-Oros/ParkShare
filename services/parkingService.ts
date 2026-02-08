/**
 * Parking Service
 * Comprehensive parking spot management with location queries,
 * status updates, verification logic, and expiration handling
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  GeoPoint,
  runTransaction,
  onSnapshot,
  QuerySnapshot,
  Query,
  Unsubscribe,
  FieldValue,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { deleteField } from 'firebase/firestore';
import {
  ParkingSpot,
  ParkingSpotReservation,
  ParkingStatus,
  PinType,
  ReservationStatus,
} from '@/models/firestore';
import { awardPointsForVerifiedPin, awardPointsForParkingConfirmation } from '@/services/pointsService';
import { trackLeavingSoonCompletion } from '@/services/rewardsService';

const COLLECTION = 'parkingSpots';
const RESERVATION_DURATION_MS = 5 * 60 * 1000;
const EXPIRY_GRACE_MS = 10 * 60 * 1000;
const EXPIRED_STATUSES: ParkingStatus[] = [
  'walk_in_expired',
  'leaving_soon_expired',
  'expired',
];

/**
 * Helper function to convert Firestore document data to ParkingSpot
 * Handles type conversion for boolean fields (string -> boolean)
 * @param docId - Document ID
 * @param data - Firestore document data
 * @returns Properly typed ParkingSpot object
 */
function convertToParkingSpot(docId: string, data: any): ParkingSpot {
  const reservationRaw = data.reservation;
  const reservation: ParkingSpotReservation | undefined = reservationRaw
    ? {
        status: reservationRaw.status as ReservationStatus,
        requesterId: String(reservationRaw.requesterId || ''),
        requestedAt: typeof reservationRaw.requestedAt === 'number'
          ? reservationRaw.requestedAt
          : Number(reservationRaw.requestedAt || 0),
        approvedAt:
          reservationRaw.approvedAt !== undefined
            ? (typeof reservationRaw.approvedAt === 'number'
                ? reservationRaw.approvedAt
                : Number(reservationRaw.approvedAt || 0))
            : undefined,
        expiresAt:
          reservationRaw.expiresAt !== undefined
            ? (typeof reservationRaw.expiresAt === 'number'
                ? reservationRaw.expiresAt
                : Number(reservationRaw.expiresAt || 0))
            : undefined,
      }
    : undefined;

  return {
    id: docId,
    userId: String(data.userId || ''),
    location: {
      latitude: typeof data.location?.latitude === 'number' ? data.location.latitude : Number(data.location?.latitude || 0),
      longitude: typeof data.location?.longitude === 'number' ? data.location.longitude : Number(data.location?.longitude || 0),
    },
    pinType: data.pinType as PinType,
    willLeaveIn: data.willLeaveIn !== undefined ? (typeof data.willLeaveIn === 'number' ? data.willLeaveIn : Number(data.willLeaveIn)) : undefined,
    isPaid: typeof data.isPaid === 'boolean' ? data.isPaid : (data.isPaid === 'true' || data.isPaid === true || data.isPaid === 1),
    status: data.status as ParkingStatus,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : Number(data.expiresAt || 0),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()),
    priorityScore: typeof data.priorityScore === 'number' ? data.priorityScore : Number(data.priorityScore || 0),
    vehicleBrand: data.vehicleBrand ? String(data.vehicleBrand) : undefined,
    vehicleModel: data.vehicleModel ? String(data.vehicleModel) : undefined,
    vehicleColor: data.vehicleColor ? String(data.vehicleColor) : undefined,
    title: data.title ? String(data.title) : undefined,
    description:
  typeof data.description === 'string' && data.description.trim() !== ''
    ? data.description
    : undefined,
    reservation,
  };
}

function shouldExpireApprovedReservation(reservation: ParkingSpotReservation | undefined, now: number) {
  return (
    reservation?.status === 'approved' &&
    typeof reservation.expiresAt === 'number' &&
    reservation.expiresAt <= now
  );
}

function shouldRejectPendingReservation(reservation: ParkingSpotReservation | undefined, spot: ParkingSpot, now: number) {
  return reservation?.status === 'pending' && spot.expiresAt <= now;
}

async function expireReservationField(spotId: string, status: ReservationStatus) {
  const spotRef = doc(firestore, COLLECTION, spotId);
  await updateDoc(spotRef, {
    'reservation.status': status,
    'reservation.expiresAt': Date.now(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Create a new parking spot pin
 * @param spotData - Parking spot data (without id)
 * @returns Document ID of created spot
 * @throws Error if validation fails or creation fails
 */
export async function createParkingSpot(
  spotData: Omit<ParkingSpot, 'id'>
): Promise<string> {
  // Trust Metrics: Atomically increment pinsCreated and set lastActivityAt on user
  try {
    const { doc, updateDoc, increment } = await import('firebase/firestore');
    const userRef = doc(firestore, 'users', spotData.userId);
    await updateDoc(userRef, {
      pinsCreated: increment(1),
      lastActivityAt: Date.now(),
    });
  } catch (e) {
    // Fails silently: do not block pin creation for metrics
    console.warn('[TrustMetrics] Unable to update pinsCreated/lastActivityAt', e);
  }
  // Validation
  if (!spotData.userId || !spotData.userId.trim()) {
    throw new Error('User ID is required');
  }

  if (!spotData.location || typeof spotData.location.latitude !== 'number' || typeof spotData.location.longitude !== 'number') {
    throw new Error('Valid location coordinates are required');
  }

  if (spotData.location.latitude < -90 || spotData.location.latitude > 90) {
    throw new Error('Invalid latitude (must be between -90 and 90)');
  }

  if (spotData.location.longitude < -180 || spotData.location.longitude > 180) {
    throw new Error('Invalid longitude (must be between -180 and 180)');
  }

  if (!spotData.pinType || !['walk-in', 'leaving-soon'].includes(spotData.pinType)) {
    throw new Error('Invalid pin type');
  }

  if (spotData.pinType === 'leaving-soon' && (!spotData.willLeaveIn || spotData.willLeaveIn < 2 || spotData.willLeaveIn > 60)) {
    throw new Error('willLeaveIn must be between 2 and 60 minutes for leaving-soon pins');
  }

  // Server-side check: prevent multiple leaving-soon pins per user
  if (spotData.pinType === 'leaving-soon') {
    try {
      const userSpots = await getUserParkingSpots(spotData.userId, false);
      const activeLeavingSoon = userSpots.filter(
        (spot) => 
          spot.pinType === 'leaving-soon' && 
          spot.status === 'leaving_soon_active' &&
          spot.expiresAt > Date.now()
      );
      
      if (activeLeavingSoon.length > 0) {
        throw new Error('You already have an active Leaving Soon pin.');
      }
    } catch (error: any) {
      // If error is our custom message, re-throw it
      if (error.message === 'You already have an active Leaving Soon pin.') {
        throw error;
      }
      // If it's an index error, log but don't block (client-side check should have caught it)
      if (error.message && error.message.includes('index')) {
        console.warn('[createParkingSpot] Index error checking leaving-soon pins (non-blocking):', error.message);
        // Continue - client-side check should have prevented this
      } else {
        // Other errors, log and continue (don't block if check fails)
        console.error('[createParkingSpot] Error checking existing leaving-soon pins:', error);
      }
    }
  }

  // CRITICAL: Ensure isPaid is a real boolean, not a string
  const isPaidValue = typeof spotData.isPaid === 'boolean' 
    ? spotData.isPaid 
    : (spotData.isPaid === 'true' || spotData.isPaid === true || spotData.isPaid === 1);

  if (!spotData.expiresAt || spotData.expiresAt < Date.now()) {
    throw new Error('expiresAt must be a future timestamp');
  }

  if (typeof spotData.priorityScore !== 'number' || spotData.priorityScore < 0) {
    throw new Error('priorityScore must be a non-negative number');
  }

  try {
    // CRITICAL: Ensure all boolean fields are real booleans when writing to Firestore
    const docRef = await addDoc(collection(firestore, COLLECTION), {
      ...spotData,
      isPaid: isPaidValue, // Use normalized boolean value
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create parking spot');
  }
}

/**
 * Get parking spot by ID
 * @param spotId - Parking spot document ID
 * @returns ParkingSpot object or null if not found
 * @throws Error if fetch fails
 */
export async function getParkingSpotById(spotId: string): Promise<ParkingSpot | null> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }

  try {
    const spotRef = doc(firestore, COLLECTION, spotId);
    const spotSnap = await getDoc(spotRef);

    if (!spotSnap.exists()) {
      return null;
    }

    const data = spotSnap.data();
    return convertToParkingSpot(spotSnap.id, data);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch parking spot');
  }
}

/**
 * Get all active parking spots (not expired or occupied)
 * @param maxResults - Maximum number of results (default: 100)
 * @returns Array of active ParkingSpot objects
 * @throws Error if fetch fails
 */
export async function getActiveParkingSpots(maxResults: number = 100): Promise<ParkingSpot[]> {
  try {
    const now = Date.now();
    // Only filter by expiresAt to avoid composite index requirement
    // Status filtering moved to client-side
    const q = query(
      collection(firestore, COLLECTION),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      limit(maxResults * 2) // Fetch more to account for client-side filtering
    );

    const snapshot = await getDocs(q);
    const spots = snapshot.docs
      .map((docSnap) => convertToParkingSpot(docSnap.id, docSnap.data()))
      // Client-side filtering: exclude expired statuses
      .filter((spot) => !['walk_in_expired', 'leaving_soon_expired', 'expired'].includes(spot.status))
      .sort((a, b) => {
        // Sort by priorityScore descending, then expiresAt ascending
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return a.expiresAt - b.expiresAt;
      })
      .slice(0, maxResults);
    
    return spots;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch active parking spots');
  }
}

/**
 * Get parking spots near a location
 * Note: Firestore doesn't support native geoqueries, so this fetches all active spots
 * For production, consider using GeoFirestore or filtering client-side
 * @param latitude - Center latitude
 * @param longitude - Center longitude
 * @param radiusKm - Radius in kilometers (for client-side filtering)
 * @param maxResults - Maximum number of results
 * @returns Array of nearby ParkingSpot objects
 */
export async function getNearbyParkingSpots(
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  maxResults: number = 50
): Promise<ParkingSpot[]> {
  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude');
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude');
  }

  // Get all active spots (client-side filtering for MVP)
  // In production, use GeoFirestore or Cloud Functions for server-side geoqueries
  const allSpots = await getActiveParkingSpots(maxResults * 2);

  // Filter by distance (Haversine formula)
  const nearbySpots: ParkingSpot[] = [];
  for (const spot of allSpots) {
    const distance = calculateDistance(
      latitude,
      longitude,
      spot.location.latitude,
      spot.location.longitude
    );

    if (distance <= radiusKm) {
      nearbySpots.push(spot);
      if (nearbySpots.length >= maxResults) {
        break;
      }
    }
  }

  return nearbySpots;
}

/**
 * Update parking spot status
 * Used for verification, expiration, and occupation
 * @param spotId - Parking spot document ID
 * @param status - New status
 * @throws Error if spot not found or update fails
 */
export async function updateParkingSpotStatus(
  spotId: string,
  status: ParkingStatus
): Promise<void> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }

  if (!['potentially-free', 'verified', 'expired', 'occupied'].includes(status)) {
    throw new Error('Invalid status');
  }

  try {
    const spotRef = doc(firestore, COLLECTION, spotId);
    const spotSnap = await getDoc(spotRef);

    if (!spotSnap.exists()) {
      throw new Error('Parking spot not found');
    }

    await updateDoc(spotRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to update parking spot status');
  }
}

/**
 * Verify a parking spot (when someone successfully parks)
 * Updates status to 'verified' and extends expiration
 * @param spotId - Parking spot document ID
 * @throws Error if spot not found or verification fails
 */
export async function verifyParkingSpot(spotId: string): Promise<void> {
  const spot = await getParkingSpotById(spotId);
  if (!spot) {
    throw new Error('Parking spot not found');
  }

  if (spot.status === 'occupied' || spot.status === 'expired') {
    throw new Error('Cannot verify an expired or occupied spot');
  }

  await updateParkingSpotStatus(spotId, 'verified');
}

/**
 * Mark parking spot as occupied
 * Called when a user confirms they parked at the spot
 * @param spotId - Parking spot document ID
 * @throws Error if spot not found or update fails
 */
export async function markSpotAsOccupied(spotId: string): Promise<void> {
  await updateParkingSpotStatus(spotId, 'occupied');
}

/**
 * Expire a parking spot
 * Called when spot timer expires or spot becomes unavailable
 * @param spotId - Parking spot document ID
 * @throws Error if spot not found or update fails
 */
export async function expireParkingSpot(spotId: string): Promise<void> {
  // Trust Metrics: increment pinsExpired for the pin author
  let spotForTracking: ParkingSpot | null = null;
  try {
    const spot = await getParkingSpotById(spotId);
    if (spot && spot.userId) {
      spotForTracking = spot;
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      const userRef = doc(firestore, 'users', spot.userId);
      await updateDoc(userRef, {
        pinsExpired: increment(1),
      });
    }
  } catch (e) {
    // Fails silently to avoid affecting main expiry logic
    console.warn('[TrustMetrics] Unable to increment pinsExpired for author', e);
  }
  await updateParkingSpotStatus(spotId, 'expired');
  if (spotForTracking) {
    // TODO: Move this to Cloud Function for trusted expiry tracking.
    trackLeavingSoonCompletion({ ...spotForTracking, status: 'expired' }).catch((error) => {
      console.warn('[Rewards] Failed to track leaving-soon completion', error);
    });
  }
}

/**
 * Update parking spot details (title, description, type, status)
 * Only the owner can update their own spots
 * @param spotId - Parking spot document ID
 * @param userId - Current user ID (must match spot owner)
 * @param updates - Partial parking spot data to update
 * @throws Error if spot not found, user is not owner, or update fails
 */
export async function updateParkingSpot(
  spotId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    pinType?: PinType;
    status?: ParkingStatus;
    willLeaveIn?: number;
    expiresAt?: number;
    isPaid?: boolean;
  }
): Promise<void> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }

  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    const spotRef = doc(firestore, COLLECTION, spotId);
    const spotSnap = await getDoc(spotRef);

    if (!spotSnap.exists()) {
      throw new Error('Parking spot not found');
    }

    const spotData = spotSnap.data() as ParkingSpot;

    // Security check: Only owner can update
    if (spotData.userId !== userId) {
      throw new Error('You do not have permission to edit this parking spot');
    }

    // Validate pinType if provided
    if (updates.pinType && !['walk-in', 'leaving-soon'].includes(updates.pinType)) {
      throw new Error('Invalid pin type');
    }

    // Validate status if provided
    const validStatuses = [
      'potentially-free',
      'verified',
      'expired',
      'occupied',
      'walk_in_pending',
      'walk_in_expired',
      'leaving_soon_active',
      'leaving_soon_expired',
    ];
    if (updates.status && !validStatuses.includes(updates.status)) {
      throw new Error('Invalid status');
    }

    // Validate willLeaveIn if provided
    if (updates.willLeaveIn !== undefined) {
      if (updates.willLeaveIn < 2 || updates.willLeaveIn > 60) {
        throw new Error('willLeaveIn must be between 2 and 60 minutes');
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) {
      updateData.title = String(updates.title || '').trim();
    }

    if (updates.description !== undefined) {
      // Handle empty/whitespace-only strings by deleting the field
      const trimmed = String(updates.description || '').trim();
      if (trimmed === '') {
        updateData.description = deleteField();
      } else {
        updateData.description = trimmed;
      }
    }

    if (updates.pinType !== undefined) {
      updateData.pinType = updates.pinType;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    if (updates.willLeaveIn !== undefined) {
      updateData.willLeaveIn = Number(updates.willLeaveIn);
    }

    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = Number(updates.expiresAt);
    }

    if (updates.isPaid !== undefined) {
      // CRITICAL: Ensure boolean is stored as boolean, not string
      updateData.isPaid = typeof updates.isPaid === 'boolean' 
        ? updates.isPaid 
        : (updates.isPaid === 'true' || updates.isPaid === true || updates.isPaid === 1);
    }

    await updateDoc(spotRef, updateData);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to update parking spot');
  }
}

/**
 * Delete a parking spot
 * Only the owner can delete their own spots
 * @param spotId - Parking spot document ID
 * @param userId - Current user ID (must match spot owner)
 * @throws Error if spot not found, user is not owner, or delete fails
 */
export async function deleteParkingSpot(spotId: string, userId: string): Promise<void> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }

  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    const spotRef = doc(firestore, COLLECTION, spotId);
    const spotSnap = await getDoc(spotRef);

    if (!spotSnap.exists()) {
      throw new Error('Parking spot not found');
    }

    const spotData = spotSnap.data() as ParkingSpot;

    // Security check: Only owner can delete
    if (spotData.userId !== userId) {
      throw new Error('You do not have permission to delete this parking spot');
    }

    await deleteDoc(spotRef);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to delete parking spot');
  }
}

/**
 * Request a reservation for a leaving-soon spot (premium-only).
 * Creates a pending reservation with a transaction to prevent races.
 */
export async function requestReservation(
  spotId: string,
  requesterId: string
): Promise<void> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }
  if (!requesterId || !requesterId.trim()) {
    throw new Error('Requester ID is required');
  }

  const spotRef = doc(firestore, COLLECTION, spotId);
  await runTransaction(firestore, async (trx) => {
    const docSnap = await trx.get(spotRef);
    if (!docSnap.exists()) throw new Error('Parking spot not found');
    const spot = convertToParkingSpot(docSnap.id, docSnap.data());
    const now = Date.now();

    if (spot.pinType !== 'leaving-soon') {
      throw new Error('Only leaving-soon pins can be reserved');
    }
    if (spot.userId === requesterId) {
      throw new Error('You cannot request your own pin');
    }
    if (spot.expiresAt <= now) {
      throw new Error('Pin has expired');
    }

    const reservation = spot.reservation;
    if (reservation?.status === 'approved') {
      if (typeof reservation.expiresAt !== 'number' || reservation.expiresAt > now) {
        throw new Error('Pin already has an approved reservation');
      }
    }
    if (reservation?.status === 'pending') {
      if (reservation.requesterId === requesterId) {
        throw new Error('You already requested this pin');
      }
      throw new Error('Reservation pending for another user');
    }

    trx.update(spotRef, {
      reservation: {
        status: 'pending',
        requesterId,
        requestedAt: now,
      },
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Approve a pending reservation (owner-only).
 * Returns "approved" or "rejected_due_to_expired".
 */
export async function approveReservation(
  spotId: string,
  ownerId: string
): Promise<'approved' | 'rejected_due_to_expired'> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }
  if (!ownerId || !ownerId.trim()) {
    throw new Error('Owner ID is required');
  }

  const spotRef = doc(firestore, COLLECTION, spotId);
  let result: 'approved' | 'rejected_due_to_expired' = 'approved';

  await runTransaction(firestore, async (trx) => {
    const docSnap = await trx.get(spotRef);
    if (!docSnap.exists()) throw new Error('Parking spot not found');
    const spot = convertToParkingSpot(docSnap.id, docSnap.data());
    const now = Date.now();

    if (spot.userId !== ownerId) {
      throw new Error('You do not have permission to approve this reservation');
    }
    if (!spot.reservation || spot.reservation.status !== 'pending') {
      throw new Error('No pending reservation to approve');
    }
    if (spot.expiresAt <= now) {
      result = 'rejected_due_to_expired';
      trx.update(spotRef, {
        'reservation.status': 'rejected',
        'reservation.expiresAt': now,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    trx.update(spotRef, {
      'reservation.status': 'approved',
      'reservation.approvedAt': now,
      // Match reservation window to pin expiration
      'reservation.expiresAt': spot.expiresAt,
      updatedAt: serverTimestamp(),
    });
  });

  return result;
}

/**
 * Reject a pending reservation (owner-only).
 */
export async function rejectReservation(spotId: string, ownerId: string): Promise<void> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }
  if (!ownerId || !ownerId.trim()) {
    throw new Error('Owner ID is required');
  }

  const spotRef = doc(firestore, COLLECTION, spotId);
  await runTransaction(firestore, async (trx) => {
    const docSnap = await trx.get(spotRef);
    if (!docSnap.exists()) throw new Error('Parking spot not found');
    const spot = convertToParkingSpot(docSnap.id, docSnap.data());
    const now = Date.now();

    if (spot.userId !== ownerId) {
      throw new Error('You do not have permission to reject this reservation');
    }
    if (!spot.reservation || spot.reservation.status !== 'pending') {
      throw new Error('No pending reservation to reject');
    }

    trx.update(spotRef, {
      'reservation.status': 'rejected',
      'reservation.expiresAt': now,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Cancel a pending reservation (requester-only).
 */
export async function cancelReservation(spotId: string, requesterId: string): Promise<void> {
  if (!spotId || !spotId.trim()) {
    throw new Error('Spot ID is required');
  }
  if (!requesterId || !requesterId.trim()) {
    throw new Error('Requester ID is required');
  }

  const spotRef = doc(firestore, COLLECTION, spotId);
  await runTransaction(firestore, async (trx) => {
    const docSnap = await trx.get(spotRef);
    if (!docSnap.exists()) throw new Error('Parking spot not found');
    const spot = convertToParkingSpot(docSnap.id, docSnap.data());
    const now = Date.now();

    if (!spot.reservation || spot.reservation.status !== 'pending') {
      throw new Error('No pending reservation to cancel');
    }
    if (spot.reservation.requesterId !== requesterId) {
      throw new Error('You do not have permission to cancel this reservation');
    }

    trx.update(spotRef, {
      'reservation.status': 'rejected',
      'reservation.expiresAt': now,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Get parking spots created by a specific user
 * @param userId - Firebase Auth UID
 * @param includeExpired - Whether to include expired spots (default: false)
 * @returns Array of user's ParkingSpot objects
 */
export async function getUserParkingSpots(
  userId: string,
  includeExpired: boolean = false
): Promise<ParkingSpot[]> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    // CRITICAL: Only filter by userId to avoid composite index requirement
    // Status and expiration filtering moved to client-side
    const q = query(
      collection(firestore, COLLECTION),
      where('userId', '==', userId)
      // Removed: orderBy('createdAt', 'desc') - requires index if combined with where
      // Removed: where('status', '!=', 'expired') - requires composite index
    );

    const snapshot = await getDocs(q);
    const now = Date.now();
    
    // Client-side filtering and sorting
    const spots = snapshot.docs
      .map((docSnap) => convertToParkingSpot(docSnap.id, docSnap.data()))
      .filter((spot) => {
        // Filter expired spots if includeExpired is false
        if (!includeExpired) {
          // Exclude expired statuses
          if (['expired', 'walk_in_expired', 'leaving_soon_expired'].includes(spot.status)) {
            return false;
          }
          // Exclude spots where expiresAt has passed
          if (spot.expiresAt <= now) {
            return false;
          }
        }
        return true;
      })
      // Sort by createdAt descending (client-side)
      .sort((a, b) => {
        const aCreated = a.createdAt || 0;
        const bCreated = b.createdAt || 0;
        return bCreated - aCreated; // Descending order
      });
    
    return spots;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user parking spots');
  }
}

/**
 * Reconcile expired pins for a user.
 * Ensures naturally expired pins are marked expired and tracked.
 * TODO: Move to Cloud Function or scheduled backend job.
 */
export async function reconcileUserExpiredPins(userId: string): Promise<void> {
  if (!userId || !userId.trim()) {
    return;
  }

  try {
    const spots = await getUserParkingSpots(userId, true);
    const now = Date.now();

    for (const spot of spots) {
      if (spot.expiresAt > now) {
        continue;
      }

      if (!EXPIRED_STATUSES.includes(spot.status)) {
        await expireParkingSpot(spot.id);
        continue;
      }

      // If already expired, ensure rewards tracking is caught up.
      // TODO: Move to Cloud Function for trusted stats updates.
      await trackLeavingSoonCompletion(spot);
    }
  } catch (error) {
    console.warn('[reconcileUserExpiredPins] Failed to reconcile user pins', error);
  }
}

/**
 * Listen to nearby spots in real-time using bounding box + client-side haversine filter.
 * @param center - {latitude, longitude}
 * @param radiusM - radius in meters
 * @param onChange - callback returning array of ParkingSpot
 * @returns function to unsubscribe
 */
export function listenToNearbySpots(
  center: { latitude: number; longitude: number },
  radiusM: number,
  onChange: (spots: ParkingSpot[]) => void
): Unsubscribe {
  const expiringSpotIds = new Set<string>();
  // Only filter by expiresAt in Firestore to avoid composite index requirement
  // Location and status filtering moved to client-side
  const now = Date.now() - EXPIRY_GRACE_MS;
  const q = query(
    collection(firestore, COLLECTION),
    where('expiresAt', '>', now)
    // Removed: status not-in (moved to client-side)
    // Removed: location bounding box filters (moved to client-side)
  );
  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const now = Date.now();
    const spots: ParkingSpot[] = [];
    snapshot.forEach((docSnap) => {
      const spot = convertToParkingSpot(docSnap.id, docSnap.data());
      if (spot.expiresAt <= now && !EXPIRED_STATUSES.includes(spot.status)) {
        if (!expiringSpotIds.has(spot.id)) {
          expiringSpotIds.add(spot.id);
          // TODO: Move expiration handling to Cloud Function for reliability.
          expireParkingSpot(spot.id)
            .catch((error) => {
              console.warn('[listenToNearbySpots] Failed to expire spot', error);
            })
            .finally(() => {
              expiringSpotIds.delete(spot.id);
            });
        }
      }
      if (shouldExpireApprovedReservation(spot.reservation, now)) {
        expireReservationField(spot.id, 'expired').catch((error) => {
          console.warn('[listenToNearbySpots] Failed to expire reservation', error);
        });
      }
      if (shouldRejectPendingReservation(spot.reservation, spot, now)) {
        expireReservationField(spot.id, 'rejected').catch((error) => {
          console.warn('[listenToNearbySpots] Failed to reject reservation', error);
        });
      }
      
      // Client-side filtering: status (exclude expired statuses)
      if (EXPIRED_STATUSES.includes(spot.status)) {
        return; // Skip expired spots
      }
      
      // Client-side filtering: location (exact radius using haversine)
      const dKm = calculateDistance(center.latitude, center.longitude, spot.location.latitude, spot.location.longitude);
      if (dKm * 1000 <= radiusM) {
        spots.push(spot);
      }
    });
    onChange(spots);
  });
}

/**
 * Confirm that a user has parked (with full verification, point awarding, history).
 * Transactionally:
 *  1. Assert spot is available to confirm
 *  2. Update spot.status ('verified')
 *  3. Create parkHistory
 *  4. Award points to both author and confirmer (apply multiplier)
 * @param spotId
 * @param confirmerUserId
 * @throws Error
 */
export async function confirmParking(
  spotId: string,
  confirmerUserId: string
): Promise<void> {
  // Trust Metrics: increment pinsVerified for the original author
  try {
    const spot = await getParkingSpotById(spotId);
    if (spot && spot.userId) {
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      const userRef = doc(firestore, 'users', spot.userId);
      await updateDoc(userRef, {
        pinsVerified: increment(1),
      });
    }
  } catch (e) {
    // Fails silently
    console.warn('[TrustMetrics] Unable to increment pinsVerified for pin author', e);
  }
  const spotRef = doc(firestore, COLLECTION, spotId);
  await runTransaction(firestore, async (trx) => {
    const docSnap = await trx.get(spotRef);
    if (!docSnap.exists()) throw new Error('Spot not found');
    const spot = docSnap.data() as ParkingSpot;
    if (spot.status !== 'potentially-free' && spot.status !== 'verified') throw new Error('Spot is not available');
    if (spot.expiresAt < Date.now()) throw new Error('Spot has expired');
    // 1. Mark as verified
    trx.update(spotRef, { status: 'verified', updatedAt: serverTimestamp() });
    // 2. Create parkHistory entry
    const historyRef = doc(collection(firestore, 'parkHistory'));
    trx.set(historyRef, {
      userId: confirmerUserId,
      spotId,
      authorUserId: spot.userId,
      confirmedAt: Date.now(),
      ratingGiven: null,
    });
    // 3. Award points (atomic is ok here for MVP, else use cloud func queue)
    // Note: Transactions can't call external async, so just do after.
  });
  // Points awarding (outside transaction)
  // It's okay (for now) if these "double write" in rare race — MVP
  const spotForPoints = await getParkingSpotById(spotId);
  await awardPointsForVerifiedPin(confirmerUserId, false);
  if (spotForPoints?.userId) {
    await awardPointsForParkingConfirmation(spotForPoints.userId, false);
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lon1 - First longitude
 * @param lat2 - Second latitude
 * @param lon2 - Second longitude
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

