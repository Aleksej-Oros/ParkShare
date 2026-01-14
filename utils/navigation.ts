/**
 * Navigation Utilities
 * Functions for opening native map applications (Google Maps, Apple Maps)
 */
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Open native navigation app with destination coordinates
 * 
 * Platform-specific behavior:
 * - iOS: Opens Apple Maps (or user's default navigation app)
 * - Android: Opens Google Maps (or user's default navigation app)
 * 
 * @param latitude - Destination latitude
 * @param longitude - Destination longitude
 * @param label - Optional label for the destination (default: "Parking Spot")
 * @returns Promise that resolves when the navigation app is opened
 * @throws Error if coordinates are invalid or navigation fails
 */
export async function openNavigation(
  latitude: number,
  longitude: number,
  label: string = 'Parking Spot'
): Promise<void> {
  // Validate coordinates
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    const error = new Error('Invalid coordinates for navigation');
    console.warn('[navigation]', error.message, { latitude, longitude });
    throw error;
  }

  // Build navigation URL based on platform
  let url: string;

  if (Platform.OS === 'ios') {
    // iOS: Use Apple Maps with directions mode
    // Format: maps://?daddr=lat,lng&dirflg=d (d = driving)
    url = `maps://?daddr=${latitude},${longitude}&dirflg=d`;
    
    // Fallback to web-based Apple Maps if native app not available
    // This will open in Safari and redirect to Maps app
    const webUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
    
    try {
      // Try native Maps app first
      await Linking.openURL(url);
    } catch (error) {
      // If native fails, try web URL
      console.warn('[navigation] Failed to open native Maps, trying web URL');
      try {
        await Linking.openURL(webUrl);
      } catch (webError) {
        console.error('[navigation] Failed to open navigation:', webError);
        throw new Error('Unable to open navigation. Please ensure a maps app is installed.');
      }
    }
  } else {
    // Android: Use Google Maps
    // Format: google.navigation:q=lat,lng
    // This opens Google Maps in navigation mode
    url = `google.navigation:q=${latitude},${longitude}`;
    
    // Fallback to web-based Google Maps
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    try {
      // Try native Google Maps navigation first
      await Linking.openURL(url);
    } catch (error) {
      // If native fails, try web URL (opens in browser, can redirect to app)
      console.warn('[navigation] Failed to open native Google Maps, trying web URL');
      try {
        await Linking.openURL(webUrl);
      } catch (webError) {
        console.error('[navigation] Failed to open navigation:', webError);
        throw new Error('Unable to open navigation. Please ensure a maps app is installed.');
      }
    }
  }
}
