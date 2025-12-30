/**
 * PinMarker Component
 * Custom marker for parking pins with color coding based on pinType and status
 */
import React from 'react';
import { Marker, MarkerProps } from 'react-native-maps';
import { MapPin } from './useMapPins';

interface PinMarkerProps extends Omit<MarkerProps, 'coordinate'> {
  pin: MapPin;
  onPress: () => void;
}

/**
 * Get marker color based on pinType and status
 * - Walk-In: Yellow (#FFD700)
 * - Leaving-Soon: Red (#FF4444)
 * - Verified: Green (#4CAF50) - verified pins use green
 * - Expired: Grey (#999999)
 */
function getPinColor(pin: MapPin): string {
  // Expired pins are grey
  if (pin.status === 'expired') {
    return '#999999'; // Grey
  }

  // Verified pins are green
  if (pin.status === 'verified') {
    return '#4CAF50'; // Green
  }

  // Base color by pinType
  if (pin.type === 'walk-in') {
    return '#FFD700'; // Yellow/Gold
  } else {
    return '#FF4444'; // Red
  }
}

/**
 * Get pin icon name for custom marker (if using custom icons)
 * For now, we use the default pinColor prop
 */
export function PinMarker({ pin, onPress, ...markerProps }: PinMarkerProps) {
  const pinColor = getPinColor(pin);
  const isVerified = pin.status === 'verified';
  const isExpired = pin.status === 'expired';

  return (
    <Marker
      {...markerProps}
      coordinate={pin.coordinate}
      pinColor={pinColor}
      onPress={onPress}
      // Add opacity for expired pins
      opacity={isExpired ? 0.5 : 1}
    >
      {/* For verified pins, we could add a custom view with green border
          For MVP, we'll use the pinColor and add a title indicator */}
    </Marker>
  );
}

export default PinMarker;




