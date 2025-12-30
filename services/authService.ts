/**
 * Authentication Service
 * Handles Firebase Auth operations beyond basic login/register
 * Includes password reset, email verification, and user profile updates
 */

import {
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateProfile,
  User as FirebaseUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '@/firebase';

/**
 * Send password reset email to user
 * @param email - User's email address
 * @throws Error if email is invalid or user not found
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

/**
 * Send email verification to current user
 * @param user - Firebase user object
 * @throws Error if user is null or already verified
 */
export async function sendEmailVerificationToUser(user: FirebaseUser): Promise<void> {
  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  try {
    await sendEmailVerification(user);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send verification email');
  }
}

/**
 * Update user's password
 * Requires reauthentication for security
 * @param user - Firebase user object
 * @param currentPassword - Current password for reauthentication
 * @param newPassword - New password (min 6 characters)
 * @throws Error if validation fails or reauthentication fails
 */
export async function updateUserPassword(
  user: FirebaseUser,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!user || !user.email) {
    throw new Error('User must be authenticated');
  }

  if (!currentPassword || currentPassword.length < 6) {
    throw new Error('Current password is required');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }

  try {
    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    if (error.code === 'auth/wrong-password') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak');
    }
    throw new Error(error.message || 'Failed to update password');
  }
}

/**
 * Update Firebase Auth profile (display name, photo URL)
 * @param user - Firebase user object
 * @param updates - Profile updates object
 * @throws Error if user is null or update fails
 */
export async function updateAuthProfile(
  user: FirebaseUser,
  updates: { displayName?: string; photoURL?: string }
): Promise<void> {
  if (!user) {
    throw new Error('User must be authenticated');
  }

  try {
    await updateProfile(user, updates);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update profile');
  }
}

/**
 * Check if current user's email is verified
 * @param user - Firebase user object
 * @returns boolean indicating verification status
 */
export function isEmailVerified(user: FirebaseUser | null): boolean {
  return user?.emailVerified ?? false;
}

