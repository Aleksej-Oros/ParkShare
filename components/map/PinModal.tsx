/**
 * PinModal Component
 * Modal that displays parking pin details when tapped
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MapPin } from './useMapPins';
import { getUserById } from '@/services/userService';
import { User } from '@/models/firestore';
import { useAuth } from '@/hooks/useAuth';
import { deleteParkingSpot, requestReservation } from '@/services/parkingService';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeColor } from '@/components/Themed';

interface PinModalProps {
  visible: boolean;
  pin: MapPin | null;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onNavigate?: () => void;
  onShowRoute?: () => void;
  onHideRoute?: () => void;
  hasRoute?: boolean; // Whether a route is currently displayed for this pin
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
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

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format distance in meters to readable string
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function PinModal({
  visible,
  pin,
  userLocation,
  onClose,
  onNavigate,
  onShowRoute,
  onHideRoute,
  hasRoute = false,
}: PinModalProps) {
  const { user } = useAuth();
  const { isPremium } = usePremiumAccess();
  const [authorProfile, setAuthorProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [localRequestPending, setLocalRequestPending] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const dividerColor = useThemeColor({}, 'divider');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;
  const successColor = Colors[colorScheme].success;

  // Check if current user is the owner
  const isOwner = user?.uid === pin?.authorId;

  const getPinExpiryTime = () => {
    if (!pin) return 0;
    return typeof pin.expiresAt === 'number' ? pin.expiresAt : 0;
  };

  // Check if pin is expired (use reservation expiry for approved requester)
  const isExpired = pin ? getPinExpiryTime() <= Date.now() : true;

  // Navigation is enabled only for premium users and non-expired pins
  const canNavigate = isPremium && !isExpired && pin !== null;
  
  // Route preview is enabled only for premium users and non-expired pins
  const canShowRoute = isPremium && !isExpired && pin !== null && userLocation !== null;

  const reservationStatus = (() => {
    if (!pin?.reservation) return null;
    if (
      pin.reservation.status === 'approved' &&
      typeof pin.reservation.expiresAt === 'number' &&
      pin.reservation.expiresAt <= Date.now()
    ) {
      return 'expired';
    }
    return pin.reservation.status;
  })();
  const isReservationRequester = pin?.reservation?.requesterId === user?.uid;
  const isReservationApproved = reservationStatus === 'approved';
  const isReservationPending = reservationStatus === 'pending';
  const isReservationRejected = reservationStatus === 'rejected' || reservationStatus === 'expired';
  const canRequestReservation =
    isPremium &&
    pin?.type === 'leaving-soon' &&
    !isOwner &&
    !isExpired &&
    (!pin?.reservation || isReservationRejected);
  const reservationButtonDisabled =
    reservationLoading ||
    localRequestPending ||
    !isPremium ||
    isExpired ||
    isOwner ||
    pin?.type !== 'leaving-soon' ||
    isReservationApproved ||
    (isReservationPending && !isReservationRejected);

  useEffect(() => {
    if (!pin?.id) {
      setLocalRequestPending(false);
      return;
    }
    if (
      pin.reservation?.status !== 'pending' ||
      pin.reservation?.requesterId !== user?.uid
    ) {
      setLocalRequestPending(false);
    }
  }, [pin?.id, pin?.reservation?.status, pin?.reservation?.requesterId, user?.uid]);

  // Calculate time remaining until expiration
  useEffect(() => {
    if (!pin) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = Date.now();
      const expiry = getPinExpiryTime();
      if (!expiry) {
        setTimeRemaining(null);
        return;
      }
      const remaining = expiry - now;
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    // Update immediately
    updateTimeRemaining();

    // Update every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [pin?.expiresAt, pin?.reservation?.expiresAt, pin?.reservation?.status, isReservationRequester]);

  // Calculate distance when pin or userLocation changes
  useEffect(() => {
    if (pin && userLocation) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        pin.coordinate.latitude,
        pin.coordinate.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [pin, userLocation]);

  // Load author profile when pin changes
  useEffect(() => {
    if (!pin) {
      setAuthorProfile(null);
      return;
    }

    setLoadingProfile(true);
    getUserById(pin.authorId)
      .then((profile) => {
        setAuthorProfile(profile);
      })
      .catch((error) => {
        console.error('[PinModal] Error loading author profile:', error);
        setAuthorProfile(null);
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, [pin?.authorId]);

  if (!pin) {
    return null;
  }

  const pinTypeLabel = pin.type === 'walk-in' ? 'Walk-In Spot' : 'Leaving Soon';
  const willLeaveText =
    pin.type === 'leaving-soon' && pin.willLeaveIn
      ? `Available in ${pin.willLeaveIn} minutes`
      : pin.type === 'walk-in'
      ? 'Available now'
      : 'Time unknown';

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Expired';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Handle edit button
  const handleEdit = () => {
    if (!pin) return;
    router.push({
      pathname: '/map/edit',
      params: {
        spotId: pin.id,
      },
    });
    onClose();
  };

  // Handle delete button
  const handleDelete = () => {
    if (!pin) return;

    Alert.alert(
      'Delete Parking Spot',
      'Are you sure you want to delete this parking spot? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteParkingSpot(pin.id, user?.uid || '');
              onClose();
              Alert.alert('Success', 'Parking spot deleted successfully');
            } catch (error: any) {
              console.error('[PinModal] Error deleting pin:', error);
              Alert.alert('Error', error.message || 'Failed to delete parking spot');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Handle navigate button
  const handleNavigate = () => {
    // Premium check: show upgrade modal for free users
    if (!isPremium) {
      setUpgradeModalVisible(true);
      return;
    }

    // Safety check: expired pins cannot be navigated to
    if (isExpired) {
      Alert.alert('Expired Pin', 'This parking spot has expired and cannot be navigated to.');
      return;
    }

    // Safety check: coordinates must be valid
    if (!pin || typeof pin.coordinate?.latitude !== 'number' || typeof pin.coordinate?.longitude !== 'number') {
      console.warn('[PinModal] Invalid coordinates for navigation', pin?.coordinate);
      Alert.alert('Error', 'Invalid location coordinates for navigation.');
      return;
    }

    // Call parent navigation handler (opens native maps)
    if (onNavigate) {
      onNavigate();
    }
  };

  // Handle show/hide route button (toggles based on current state)
  const handleRouteToggle = () => {
    // If route is already shown, hide it
    if (hasRoute && onHideRoute) {
      onHideRoute();
      return;
    }

    // Otherwise, show route
    // Premium check: show upgrade modal for free users
    if (!isPremium) {
      setUpgradeModalVisible(true);
      return;
    }

    // Safety check: expired pins cannot show route
    if (isExpired) {
      Alert.alert('Expired Pin', 'This parking spot has expired and cannot show route.');
      return;
    }

    // Safety check: coordinates must be valid
    if (!pin || !userLocation) {
      Alert.alert('Error', 'Unable to show route. Location data is missing.');
      return;
    }

    if (
      typeof pin.coordinate?.latitude !== 'number' ||
      typeof pin.coordinate?.longitude !== 'number' ||
      typeof userLocation.latitude !== 'number' ||
      typeof userLocation.longitude !== 'number'
    ) {
      console.warn('[PinModal] Invalid coordinates for route', { pin: pin?.coordinate, userLocation });
      Alert.alert('Error', 'Invalid location coordinates for route.');
      return;
    }

    // Call parent route handler
    if (onShowRoute) {
      onShowRoute();
    }
  };

  const handleRequestReservation = async () => {
    if (!pin || !user?.uid) {
      Alert.alert('Login Required', 'You must be logged in to request a reservation.');
      return;
    }
    if (!isPremium) {
      setUpgradeModalVisible(true);
      return;
    }
    if (!canRequestReservation) {
      return;
    }

    setReservationLoading(true);
    setLocalRequestPending(true);
    try {
      await requestReservation(pin.id, user.uid);
      Alert.alert('Request Sent', 'Your reservation request has been sent to the pin owner.');
    } catch (error: any) {
      console.error('[PinModal] Error requesting reservation:', error);
      Alert.alert('Request Failed', error.message || 'Unable to request reservation.');
      setLocalRequestPending(false);
    } finally {
      setReservationLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: cardBackground }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: tintColor }]}>{pinTypeLabel}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: dividerColor }]}>
              <Text style={[styles.closeButtonText, { color: textSecondaryColor }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScrollContainer}
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.trustHeaderSection, { borderBottomColor: tintColor + '40' }]}>
  {/* Trust Header - User Source, Vehicle (for "leaving-soon") */}
  {loadingProfile ? (
    <View style={styles.trustRowSkeleton}>
      <ActivityIndicator size="small" color={tintColor} />
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>Loading user…</Text>
    </View>
  ) : !authorProfile && (
    <View style={styles.trustRowMissing}>
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>Unknown user</Text>
    </View>
  )}
  {authorProfile && (
    <View style={styles.trustRow}>
      {/* DisplayName always for both types */}
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>Source:</Text>
      <Text style={[styles.trustValue, { color: textColor }]}>
        {authorProfile.displayName?.trim() || 'Anonymous'}
      </Text>
    </View>
  )}
  {/* Show vehicle info for leaving-soon only and only on user fetch success */}
  {authorProfile && pin.type === 'leaving-soon' && (
    <View style={styles.trustRow}>
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>Vehicle:</Text>
      <Text style={[styles.trustValue, { color: textColor }]}>
        {/* show as one line, only fields that exist, else fallback */}
        {authorProfile.vehicleBrand || authorProfile.vehicleModel || authorProfile.vehicleColor
          ? [authorProfile.vehicleBrand, authorProfile.vehicleModel, authorProfile.vehicleColor].filter(Boolean).join(' ')
          : '—'}
      </Text>
    </View>
  )}
            </View>

            <View style={styles.modalBody}>
            {/* Title (if available) */}

            {/* Description (if non-empty) */}
{pin.description && pin.description.trim() !== '' && (
  <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
    <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Description:</Text>
    <Text style={[styles.infoValue, { color: textColor }]}>{pin.description}</Text>
  </View>
)}

            {/* Pin Type */}
            <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Type:</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>{pinTypeLabel}</Text>
            </View>

            {/* Time until available */}
            <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Availability:</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>{willLeaveText}</Text>
            </View>

            {/* Expiration Countdown */}
            {timeRemaining !== null && !(isReservationApproved && isReservationRequester) && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Expires in:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: textColor },
                    timeRemaining <= 60000 && { color: errorColor, fontWeight: 'bold' }, // Red if less than 1 minute
                  ]}
                >
                  {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>
            )}

            {/* Distance */}
            {distance !== null && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Distance:</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>{formatDistance(distance)}</Text>
              </View>
            )}

            {/* Status */}

            {/* Paid/Free */}
            <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Payment:</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {pin.isPaid ? 'Paid' : 'Free'}
              </Text>
            </View>

            {!!reservationStatus && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Reservation:</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>
                  {reservationStatus === 'pending'
                    ? isReservationRequester
                      ? 'Pending (you requested)'
                      : 'Reservation pending'
                    : reservationStatus === 'approved'
                    ? isReservationRequester
                      ? 'Approved (for you)'
                      : 'Approved'
                    : reservationStatus === 'rejected'
                    ? 'Rejected'
                    : 'Expired'}
                </Text>
              </View>
            )}

            {isReservationApproved && isReservationRequester && timeRemaining !== null && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>Arrive within:</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>
                  {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>
            )}
            </View>

          {/* Owner Controls */}
          {isOwner && (
            <View style={styles.ownerControls}>
              <Button
                title="Edit"
                onPress={handleEdit}
                variant="primary"
                disabled={deleting}
                style={styles.ownerButton}
              />
              <Button
                title="Delete"
                onPress={handleDelete}
                variant="danger"
                loading={deleting}
                disabled={deleting}
                style={styles.ownerButton}
              />
            </View>
          )}

          {/* Show/Hide Route Button (premium-only) */}
          {canShowRoute && (
            <Button
              title={hasRoute ? 'Hide Route' : 'Show Route'}
              onPress={handleRouteToggle}
              variant={hasRoute ? 'danger' : 'success'}
              disabled={!canShowRoute}
              style={styles.actionButton}
            />
          )}

          {/* Request Reservation Button (premium-only, leaving-soon) */}
          {pin.type === 'leaving-soon' && !isOwner && (
            <Button
              title={isPremium ? 'Request Reservation' : 'Request Reservation (Premium)'}
              onPress={handleRequestReservation}
              variant="primary"
              loading={reservationLoading}
              disabled={reservationButtonDisabled}
              style={styles.actionButton}
            />
          )}

            {/* Navigate Button (premium-only) */}
            <Button
              title={isExpired ? 'Expired' : isPremium ? 'Navigate' : 'Navigate (Premium)'}
              onPress={handleNavigate}
              variant="primary"
              disabled={!canNavigate || isExpired}
              style={styles.actionButton}
            />
          </ScrollView>
        </View>
      </Pressable>

      {/* Upgrade Modal (shown to free users) */}
      <UpgradeModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        message="Premium is required to request reservations or navigate."
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  trustHeaderSection: {
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 2,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  trustRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
  },
  trustRowMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  trustLabel: {
    fontWeight: '500',
    marginRight: 10,
    fontSize: 15,
    minWidth: 90,
  },
  trustValue: {
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollContainer: {
    flexShrink: 1,
  },
  modalScroll: {
    flexGrow: 0,
    paddingBottom: 12,
  },
  modalBody: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 10,
  },
  ownerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  ownerButton: {
    flex: 1,
  },
});

export default PinModal;




