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
  const normalizedEmail = email.trim().toLowerCase();
  const resetRedirectUrl = process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL;

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }

  try {
    await sendPasswordResetEmail(
      auth,
      normalizedEmail,
      resetRedirectUrl
        ? {
            url: resetRedirectUrl,
            handleCodeInApp: false,
          }
        : undefined
    );
  } catch (error: any) {
    switch (error?.code) {
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/missing-email':
        throw new Error('Email is required');
      case 'auth/invalid-continue-uri':
        throw new Error('Password reset redirect URL is invalid.');
      case 'auth/unauthorized-continue-uri':
        throw new Error('Password reset redirect URL is not authorized for this Firebase project.');
      case 'auth/too-many-requests':
        throw new Error('Too many reset attempts. Please wait and try again.');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your internet connection and try again.');
      default:
        throw new Error(error?.message || 'Failed to send password reset email');
    }
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

