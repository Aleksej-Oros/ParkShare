/**
 * PinMarker Component
 * Custom marker for parking pins with color coding based on pinType and Firestore status
 */
import React from 'react';
import { Marker } from 'react-native-maps';
import { MapPin } from './useMapPins';
import { ParkingStatus } from '@/models/firestore';

interface PinMarkerProps {
  pin: MapPin;
  onPress: () => void;
}

/**
 * Helper: check if pin status represents an expired pin
 */
function isExpiredStatus(status: ParkingStatus): boolean {
  return (
    status === 'walk_in_expired' ||
    status === 'leaving_soon_expired' ||
    status === 'expired'
  );
}

/**
 * Helper: check if pin should be considered "verified" in UI
 * (Leaving-soon active pins are treated as verified)
 */
function isVerifiedStatus(status: ParkingStatus): boolean {
  return status === 'leaving_soon_active';
}

/**
 * Get marker color based on pin type and Firestore status
 */
function getPinColor(pin: MapPin): string {
  if (isExpiredStatus(pin.status)) {
    return '#999999'; // Grey
  }

  if (isVerifiedStatus(pin.status)) {
    return '#4CAF50'; // Green
  }

  if (pin.type === 'walk-in') {
    return '#FFD700'; // Yellow
  }

  return '#FF4444'; // Red
}

/**
 * PinMarker Component
 */
export function PinMarker({ pin, onPress }: PinMarkerProps) {
  const pinColor = getPinColor(pin);
  const isExpired = isExpiredStatus(pin.status);

  return (
    <Marker
      coordinate={pin.coordinate}
      pinColor={pinColor}
      onPress={onPress}
      opacity={isExpired ? 0.5 : 1}
    />
  );
}

export default PinMarker;
