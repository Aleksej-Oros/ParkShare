/**
 * Notifications Service
 * Manages push notifications using Expo Notifications
 * Handles notification permissions, scheduling, and delivery
 * Differentiates between free and premium user notification delays
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isUserPremium } from '@/services/subscriptionService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * Required before sending notifications
 * @returns Permission status object
 */
export async function requestNotificationPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Notification permissions not granted');
    }

    // Configure for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return { status: finalStatus };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to request notification permissions');
  }
}

/**
 * Check if notification permissions are granted
 * @returns boolean indicating permission status
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
}

/**
 * Schedule a local notification
 * @param title - Notification title
 * @param body - Notification body text
 * @param delaySeconds - Delay in seconds before showing (0 for immediate)
 * @param data - Additional data payload
 * @returns Notification identifier
 */
export async function scheduleNotification(
  title: string,
  body: string,
  delaySeconds: number = 0,
  data?: Record<string, any>
): Promise<string> {
  if (!title || !title.trim()) {
    throw new Error('Notification title is required');
  }

  if (!body || !body.trim()) {
    throw new Error('Notification body is required');
  }

  if (delaySeconds < 0) {
    throw new Error('Delay cannot be negative');
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
    });

    return identifier;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to schedule notification');
  }
}

/**
 * Send notification for new nearby parking pin
 * Free users get delayed notification (60-90s), premium get instant
 * @param userId - Firebase Auth UID
 * @param spotLocation - Location of the parking spot
 * @param pinType - Type of pin
 * @throws Error if notification fails
 */
export async function notifyNewNearbyPin(
  userId: string,
  spotLocation: { latitude: number; longitude: number },
  pinType: 'walk-in' | 'leaving-soon'
): Promise<void> {
  const hasPermissions = await hasNotificationPermissions();
  if (!hasPermissions) {
    // Silently fail if permissions not granted
    return;
  }

  const isPremium = await isUserPremium(userId);
  const delaySeconds = isPremium ? 0 : Math.floor(Math.random() * 30) + 60; // 60-90s for free

  const title = pinType === 'leaving-soon' ? '🚗 Leaving Soon Pin Nearby!' : '📍 New Parking Spot Nearby!';
  const body =
    pinType === 'leaving-soon'
      ? 'Someone is leaving their spot soon. Check it out!'
      : 'A new parking spot has been shared nearby.';

  await scheduleNotification(title, body, delaySeconds, {
    type: 'new-pin',
    pinType,
    location: spotLocation,
  });
}

/**
 * Send notification when user's pin is verified
 * @param userId - Firebase Auth UID
 * @param spotId - Parking spot ID
 * @throws Error if notification fails
 */
export async function notifyPinVerified(userId: string, spotId: string): Promise<void> {
  const hasPermissions = await hasNotificationPermissions();
  if (!hasPermissions) {
    return;
  }

  const title = '✅ Pin Verified!';
  const body = 'Great! Someone successfully parked at your shared spot. You earned Park Points!';

  await scheduleNotification(title, body, 0, {
    type: 'pin-verified',
    spotId,
  });
}

/**
 * Send notification when someone confirms parking on leaving-soon pin
 * @param userId - Firebase Auth UID
 * @param spotId - Parking spot ID
 * @throws Error if notification fails
 */
export async function notifyParkingConfirmed(userId: string, spotId: string): Promise<void> {
  const hasPermissions = await hasNotificationPermissions();
  if (!hasPermissions) {
    return;
  }

  const title = '🎉 Parking Confirmed!';
  const body = 'Someone confirmed parking at your leaving-soon spot. You earned full points!';

  await scheduleNotification(title, body, 0, {
    type: 'parking-confirmed',
    spotId,
  });
}

/**
 * Send trial expiration reminder
 * @param userId - Firebase Auth UID
 * @param daysRemaining - Days until trial expires
 * @throws Error if notification fails
 */
export async function notifyTrialExpiring(userId: string, daysRemaining: number): Promise<void> {
  const hasPermissions = await hasNotificationPermissions();
  if (!hasPermissions) {
    return;
  }

  const title = `⏰ Trial Expiring Soon`;
  const body = `Your premium trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Upgrade to keep your premium benefits!`;

  await scheduleNotification(title, body, 0, {
    type: 'trial-expiring',
    daysRemaining,
  });
}

/**
 * Send premium expiration warning
 * @param userId - Firebase Auth UID
 * @throws Error if notification fails
 */
export async function notifyPremiumExpiring(userId: string): Promise<void> {
  const hasPermissions = await hasNotificationPermissions();
  if (!hasPermissions) {
    return;
  }

  const title = '⚠️ Premium Expiring';
  const body = 'Your premium subscription is expiring soon. Renew to keep your benefits!';

  await scheduleNotification(title, body, 0, {
    type: 'premium-expiring',
  });
}

/**
 * Cancel a scheduled notification
 * @param notificationId - Notification identifier
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to cancel notification');
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to cancel all notifications');
  }
}

/**
 * Get device push token
 * Required for remote push notifications (future implementation)
 * @returns Expo push token
 */
export async function getPushToken(): Promise<string> {
  try {
    const hasPermissions = await hasNotificationPermissions();
    if (!hasPermissions) {
      throw new Error('Notification permissions not granted');
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // Replace with your Expo project ID
    });

    return token.data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get push token');
  }
}

/**
 * Handle notification received while app is in foreground
 * Can be used to show custom UI or navigate to specific screen
 * @param notification - Notification object
 */
export function handleNotificationReceived(notification: Notifications.Notification): void {
  const data = notification.request.content.data;

  // Handle different notification types
  switch (data?.type) {
    case 'new-pin':
      // Navigate to map screen, highlight new pin
      break;
    case 'pin-verified':
      // Show success message or navigate to points screen
      break;
    case 'parking-confirmed':
      // Show confirmation message
      break;
    case 'trial-expiring':
      // Navigate to subscription screen
      break;
    default:
      break;
  }
}

