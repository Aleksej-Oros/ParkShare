/**
 * User Service
 * Handles CRUD operations for user profiles in Firestore
 * Manages user data, ratings, vehicle info, and gamification stats
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
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { User } from '@/models/firestore';

const COLLECTION = 'users';

/**
 * Check if a user is onboarded (has user doc in Firestore)
 * @param userId - Firebase Auth UID
 * @returns Promise<boolean> - true if doc exists, false otherwise
 */
export async function isUserOnboarded(userId: string): Promise<boolean> {
  if (!userId || !userId.trim()) return false;
  try {
    const userRef = doc(firestore, COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch {
    return false;
  }
}

/**
 * Create a new user document in Firestore
 * Called after successful Firebase Auth registration
 * @param userId - Firebase Auth UID
 * @param userData - Initial user data (partial User object)
 * @throws Error if user already exists or creation fails
 */
export async function createUser(
  userId: string,
  userData: Partial<Omit<User, 'id'>> & { displayName: string }
): Promise<void> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (!userData.displayName || !userData.displayName.trim()) {
    throw new Error('Display name is required');
  }

  // Check if user already exists
  const userRef = doc(firestore, COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    throw new Error('User already exists');
  }

  // Create default user object
  const newUser: Omit<User, 'id'> = {
    displayName: userData.displayName.trim(),
    rating: userData.rating ?? 5.0,
    vehicleBrand: userData.vehicleBrand ?? '',
    vehicleModel: userData.vehicleModel ?? '',
    vehicleColor: userData.vehicleColor ?? '',
    parkPoints: userData.parkPoints ?? 0,
    reliabilityScore: userData.reliabilityScore ?? 50,
    badges: userData.badges ?? [],
    isTester: userData.isTester ?? false,
    isPremium: userData.isPremium ?? false,
    isActive: userData.isActive ?? true,
    isOnboarded: userData.isOnboarded ?? false, // New users start with isOnboarded: false
  };

  try {
    // CRITICAL: Ensure ALL boolean fields are stored as booleans, not strings
    await setDoc(userRef, {
      displayName: String(newUser.displayName || '').trim(),
      rating: Number(newUser.rating || 5.0),
      vehicleBrand: String(newUser.vehicleBrand || '').trim(),
      vehicleModel: String(newUser.vehicleModel || '').trim(),
      vehicleColor: String(newUser.vehicleColor || '').trim(),
      parkPoints: Number(newUser.parkPoints || 0),
      reliabilityScore: Number(newUser.reliabilityScore || 50),
      badges: Array.isArray(newUser.badges) ? newUser.badges : [],
      isTester: typeof newUser.isTester === 'boolean' ? newUser.isTester : (newUser.isTester === 'true' || newUser.isTester === true || newUser.isTester === 1),
      isPremium: typeof newUser.isPremium === 'boolean' ? newUser.isPremium : (newUser.isPremium === 'true' || newUser.isPremium === true || newUser.isPremium === 1),
      isActive: typeof newUser.isActive === 'boolean' ? newUser.isActive : (newUser.isActive !== 'false' && newUser.isActive !== false && newUser.isActive !== 0),
      isOnboarded: typeof newUser.isOnboarded === 'boolean' ? newUser.isOnboarded : (newUser.isOnboarded === 'true' || newUser.isOnboarded === true || newUser.isOnboarded === 1),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create user');
  }
}

/**
 * Get user document by ID
 * @param userId - Firebase Auth UID
 * @returns User object or null if not found
 * @throws Error if fetch fails
 */
export async function getUserById(userId: string): Promise<User | null> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    const userRef = doc(firestore, COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();
    
    // CRITICAL: Convert string booleans to actual booleans when reading from Firestore
    // This handles cases where data was stored as strings ("true"/"false") instead of booleans
    return {
      id: userSnap.id,
      displayName: String(data.displayName || ''),
      rating: typeof data.rating === 'number' ? data.rating : Number(data.rating || 5.0),
      vehicleBrand: String(data.vehicleBrand || ''),
      vehicleModel: String(data.vehicleModel || ''),
      vehicleColor: String(data.vehicleColor || ''),
      parkPoints: typeof data.parkPoints === 'number' ? data.parkPoints : Number(data.parkPoints || 0),
      reliabilityScore: typeof data.reliabilityScore === 'number' ? data.reliabilityScore : Number(data.reliabilityScore || 50),
      badges: Array.isArray(data.badges) ? data.badges : [],
      isTester: typeof data.isTester === 'boolean' ? data.isTester : (data.isTester === 'true' || data.isTester === true || data.isTester === 1),
      isPremium: typeof data.isPremium === 'boolean' ? data.isPremium : (data.isPremium === 'true' || data.isPremium === true || data.isPremium === 1),
      isActive: typeof data.isActive === 'boolean' ? data.isActive : (data.isActive !== 'false' && data.isActive !== false && data.isActive !== 0),
      isOnboarded: typeof data.isOnboarded === 'boolean' ? data.isOnboarded : (data.isOnboarded === 'true' || data.isOnboarded === true || data.isOnboarded === 1),
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user');
  }
}

/**
 * Upsert user document (create or update)
 * If user exists, updates with merge. If not, creates new document.
 * Used during onboarding to handle cases where user document may already exist.
 * @param userId - Firebase Auth UID
 * @param userData - User data to set/update
 * @throws Error if userId is invalid or Firestore write fails
 */
export async function upsertUser(
  userId: string,
  userData: Partial<Omit<User, 'id'>> & { displayName: string }
): Promise<void> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (!userData.displayName || !userData.displayName.trim()) {
    throw new Error('Display name is required');
  }

  try {
    const userRef = doc(firestore, COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    // Prepare user data with defaults
    const fullUserData: Omit<User, 'id'> = {
      displayName: userData.displayName.trim(),
      rating: userData.rating ?? 5.0,
      vehicleBrand: userData.vehicleBrand ?? '',
      vehicleModel: userData.vehicleModel ?? '',
      vehicleColor: userData.vehicleColor ?? '',
      parkPoints: userData.parkPoints ?? 0,
      reliabilityScore: userData.reliabilityScore ?? 50,
      badges: userData.badges ?? [],
      isTester: userData.isTester ?? false,
      isPremium: userData.isPremium ?? false,
      isActive: userData.isActive ?? true,
      isOnboarded: userData.isOnboarded ?? false,
    };

    if (userSnap.exists()) {
      // User exists: update with merge to preserve existing fields
      // Get existing data to preserve fields that shouldn't be overwritten
      const existingData = userSnap.data() as Omit<User, 'id'>;
      
      // Build update object: only update onboarding fields, preserve existing data
      // CRITICAL: Ensure all fields are correct types (strings for text, booleans for flags)
      const updateData: any = {
        displayName: String(fullUserData.displayName || '').trim(),
        vehicleBrand: String(fullUserData.vehicleBrand || '').trim(),
        vehicleModel: String(fullUserData.vehicleModel || '').trim(),
        vehicleColor: String(fullUserData.vehicleColor || '').trim(),
        isOnboarded: typeof fullUserData.isOnboarded === 'boolean' ? fullUserData.isOnboarded : (fullUserData.isOnboarded === 'true' || fullUserData.isOnboarded === true || fullUserData.isOnboarded === 1),
        updatedAt: serverTimestamp(),
      };

      // Preserve existing fields - only update if explicitly provided in userData
      // This ensures we don't overwrite existing parkPoints, reliabilityScore, badges, etc.
      if (userData.parkPoints !== undefined) {
        updateData.parkPoints = userData.parkPoints;
      } else {
        // Preserve existing value
        updateData.parkPoints = existingData.parkPoints ?? 0;
      }

      if (userData.reliabilityScore !== undefined) {
        updateData.reliabilityScore = userData.reliabilityScore;
      } else {
        // Preserve existing value
        updateData.reliabilityScore = existingData.reliabilityScore ?? 50;
      }

      if (userData.badges === undefined) {
        updateData.badges = existingData.badges ?? [];
      } else {
        updateData.badges = userData.badges;
      }

      // CRITICAL: Ensure ALL boolean fields are stored as booleans, not strings
      // This includes both new values and preserved existing values
      if (userData.isTester === undefined) {
        // Preserve existing value, but ensure it's a boolean (may be string from old data)
        const existingIsTester = existingData.isTester ?? false;
        updateData.isTester = typeof existingIsTester === 'boolean' ? existingIsTester : (existingIsTester === 'true' || existingIsTester === true || existingIsTester === 1);
      } else {
        // User provided value - ensure it's a boolean
        updateData.isTester = typeof userData.isTester === 'boolean' ? userData.isTester : (userData.isTester === 'true' || userData.isTester === true || userData.isTester === 1);
      }

      if (userData.isPremium === undefined) {
        // Preserve existing value, but ensure it's a boolean (may be string from old data)
        const existingIsPremium = existingData.isPremium ?? false;
        updateData.isPremium = typeof existingIsPremium === 'boolean' ? existingIsPremium : (existingIsPremium === 'true' || existingIsPremium === true || existingIsPremium === 1);
      } else {
        // User provided value - ensure it's a boolean
        updateData.isPremium = typeof userData.isPremium === 'boolean' ? userData.isPremium : (userData.isPremium === 'true' || userData.isPremium === true || userData.isPremium === 1);
      }

      if (userData.isActive === undefined) {
        // Preserve existing value, but ensure it's a boolean (may be string from old data)
        const existingIsActive = existingData.isActive ?? true;
        updateData.isActive = typeof existingIsActive === 'boolean' ? existingIsActive : (existingIsActive !== 'false' && existingIsActive !== false && existingIsActive !== 0);
      } else {
        // User provided value - ensure it's a boolean
        updateData.isActive = typeof userData.isActive === 'boolean' ? userData.isActive : (userData.isActive !== 'false' && userData.isActive !== false && userData.isActive !== 0);
      }

      if (userData.rating === undefined) {
        updateData.rating = existingData.rating ?? 5.0;
      } else {
        updateData.rating = userData.rating;
      }

      await updateDoc(userRef, updateData);
      // createdAt is preserved automatically by Firestore (not included in update)
    } else {
      // User doesn't exist: create new document
      // CRITICAL: Ensure all string fields are actually strings (not booleans)
      await setDoc(userRef, {
        displayName: String(fullUserData.displayName || '').trim(),
        rating: Number(fullUserData.rating || 5.0),
        vehicleBrand: String(fullUserData.vehicleBrand || '').trim(),
        vehicleModel: String(fullUserData.vehicleModel || '').trim(),
        vehicleColor: String(fullUserData.vehicleColor || '').trim(),
        parkPoints: Number(fullUserData.parkPoints || 0),
        reliabilityScore: Number(fullUserData.reliabilityScore || 50),
        badges: Array.isArray(fullUserData.badges) ? fullUserData.badges : [],
        // CRITICAL: Ensure ALL boolean fields are stored as booleans, not strings
        isTester: typeof fullUserData.isTester === 'boolean' ? fullUserData.isTester : (fullUserData.isTester === 'true' || fullUserData.isTester === true || fullUserData.isTester === 1),
        isPremium: typeof fullUserData.isPremium === 'boolean' ? fullUserData.isPremium : (fullUserData.isPremium === 'true' || fullUserData.isPremium === true || fullUserData.isPremium === 1),
        isActive: typeof fullUserData.isActive === 'boolean' ? fullUserData.isActive : (fullUserData.isActive !== 'false' && fullUserData.isActive !== false && fullUserData.isActive !== 0),
        isOnboarded: typeof fullUserData.isOnboarded === 'boolean' ? fullUserData.isOnboarded : (fullUserData.isOnboarded === 'true' || fullUserData.isOnboarded === true || fullUserData.isOnboarded === 1),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to save user profile');
  }
}

/**
 * Update user document
 * Only updates provided fields
 * @param userId - Firebase Auth UID
 * @param updates - Partial user data to update
 * @throws Error if user not found or update fails
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id'>>
): Promise<void> {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  // Validate display name if provided
  if (updates.displayName !== undefined) {
    if (!updates.displayName || !updates.displayName.trim()) {
      throw new Error('Display name cannot be empty');
    }
    updates.displayName = updates.displayName.trim();
  }

  // Validate rating if provided
  if (updates.rating !== undefined) {
    if (updates.rating < 0 || updates.rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
  }

  // Validate reliability score if provided
  if (updates.reliabilityScore !== undefined) {
    if (updates.reliabilityScore < 0 || updates.reliabilityScore > 100) {
      throw new Error('Reliability score must be between 0 and 100');
    }
  }

  try {
    const userRef = doc(firestore, COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    // Build update object with type-safe conversions
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    // CRITICAL: Ensure all string fields are actually strings (not booleans)
    if (updates.displayName !== undefined) {
      updateData.displayName = String(updates.displayName || '').trim();
    }
    if (updates.vehicleBrand !== undefined) {
      updateData.vehicleBrand = String(updates.vehicleBrand || '').trim();
    }
    if (updates.vehicleModel !== undefined) {
      updateData.vehicleModel = String(updates.vehicleModel || '').trim();
    }
    if (updates.vehicleColor !== undefined) {
      updateData.vehicleColor = String(updates.vehicleColor || '').trim();
    }
    if (updates.rating !== undefined) {
      updateData.rating = Number(updates.rating);
    }
    if (updates.reliabilityScore !== undefined) {
      updateData.reliabilityScore = Number(updates.reliabilityScore);
    }
    if (updates.parkPoints !== undefined) {
      updateData.parkPoints = Number(updates.parkPoints);
    }
    if (updates.badges !== undefined) {
      updateData.badges = Array.isArray(updates.badges) ? updates.badges : [];
    }
    if (updates.isTester !== undefined) {
      // CRITICAL: Ensure boolean is stored as boolean, not string
      updateData.isTester = typeof updates.isTester === 'boolean' ? updates.isTester : (updates.isTester === 'true' || updates.isTester === true || updates.isTester === 1);
    }
    if (updates.isPremium !== undefined) {
      // CRITICAL: Ensure boolean is stored as boolean, not string
      updateData.isPremium = typeof updates.isPremium === 'boolean' ? updates.isPremium : (updates.isPremium === 'true' || updates.isPremium === true || updates.isPremium === 1);
    }
    if (updates.isActive !== undefined) {
      // CRITICAL: Ensure boolean is stored as boolean, not string
      updateData.isActive = typeof updates.isActive === 'boolean' ? updates.isActive : (updates.isActive !== 'false' && updates.isActive !== false && updates.isActive !== 0);
    }
    if (updates.isOnboarded !== undefined) {
      // CRITICAL: Ensure boolean is stored as boolean, not string
      updateData.isOnboarded = typeof updates.isOnboarded === 'boolean' ? updates.isOnboarded : (updates.isOnboarded === 'true' || updates.isOnboarded === true || updates.isOnboarded === 1);
    }

    await updateDoc(userRef, updateData);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw error;
    }
    throw new Error(error.message || 'Failed to update user');
  }
}

/**
 * Update user's vehicle information
 * @param userId - Firebase Auth UID
 * @param vehicleInfo - Vehicle brand, model, and color
 * @throws Error if validation fails or update fails
 */
export async function updateVehicleInfo(
  userId: string,
  vehicleInfo: {
    vehicleBrand: string;
    vehicleModel: string;
    vehicleColor: string;
  }
): Promise<void> {
  if (!vehicleInfo.vehicleBrand || !vehicleInfo.vehicleBrand.trim()) {
    throw new Error('Vehicle brand is required');
  }

  if (!vehicleInfo.vehicleModel || !vehicleInfo.vehicleModel.trim()) {
    throw new Error('Vehicle model is required');
  }

  if (!vehicleInfo.vehicleColor || !vehicleInfo.vehicleColor.trim()) {
    throw new Error('Vehicle color is required');
  }

  await updateUser(userId, {
    vehicleBrand: vehicleInfo.vehicleBrand.trim(),
    vehicleModel: vehicleInfo.vehicleModel.trim(),
    vehicleColor: vehicleInfo.vehicleColor.trim(),
  });
}

/**
 * Update user rating (called after parking confirmation)
 * Calculates new average rating
 * @param userId - Firebase Auth UID
 * @param newRating - Rating value (1-5)
 * @throws Error if rating is invalid or update fails
 */
export async function updateUserRating(userId: string, newRating: number): Promise<void> {
  if (newRating < 1 || newRating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Simple average calculation (in production, you might want more sophisticated logic)
  const currentRating = user.rating;
  const newAverageRating = (currentRating + newRating) / 2;

  await updateUser(userId, {
    rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal
  });
}

/**
 * Add badge to user's badge array
 * @param userId - Firebase Auth UID
 * @param badgeName - Badge identifier (e.g., 'trusted-source', 'top-sharer')
 * @throws Error if badge already exists or update fails
 */
export async function addBadge(userId: string, badgeName: string): Promise<void> {
  if (!badgeName || !badgeName.trim()) {
    throw new Error('Badge name is required');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.badges.includes(badgeName)) {
    throw new Error('Badge already exists');
  }

  await updateUser(userId, {
    badges: [...user.badges, badgeName],
  });
}

/**
 * Soft delete user (deactivate account)
 * @param userId - Firebase Auth UID
 * @throws Error if user not found or update fails
 */
export async function deactivateUser(userId: string): Promise<void> {
  await updateUser(userId, {
    isActive: false,
  });
}

/**
 * Get multiple users by IDs
 * Useful for displaying user info in lists
 * @param userIds - Array of user IDs
 * @returns Array of User objects
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  try {
    const users: User[] = [];
    const promises = userIds.map((id) => getUserById(id));
    const results = await Promise.all(promises);

    results.forEach((user) => {
      if (user) {
        users.push(user);
      }
    });

    return users;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch users');
  }
}
