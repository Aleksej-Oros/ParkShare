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
import { useLocale } from '@/context/LocaleContext';

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
  const { t } = useLocale();
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

  const pinTypeLabel = pin.type === 'walk-in' ? t('pinModal.walkInSpot') : t('pinModal.leavingSoon');
  const willLeaveText =
    pin.type === 'leaving-soon' && pin.willLeaveIn
      ? t('pinModal.availableInMinutes', { count: pin.willLeaveIn })
      : pin.type === 'walk-in'
      ? t('pinModal.availableNow')
      : t('pinModal.timeUnknown');

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return t('pinModal.expired');
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return t('pinModal.timeFormatShort', { minutes, seconds });
    }
    return t('pinModal.timeFormatSeconds', { seconds });
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
      t('pinModal.deleteTitle'),
      t('pinModal.deleteMessage'),
      [
        {
          text: t('pinModal.cancel'),
          style: 'cancel',
        },
        {
          text: t('pinModal.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteParkingSpot(pin.id, user?.uid || '');
              onClose();
              Alert.alert(t('pinModal.deleteSuccessTitle'), t('pinModal.deleteSuccessMessage'));
            } catch (error: any) {
              console.error('[PinModal] Error deleting pin:', error);
              Alert.alert(t('pinModal.errorTitle'), error.message || t('pinModal.deleteErrorMessage'));
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
      Alert.alert(t('pinModal.expiredPinTitle'), t('pinModal.expiredPinNavigateMessage'));
      return;
    }

    // Safety check: coordinates must be valid
    if (!pin || typeof pin.coordinate?.latitude !== 'number' || typeof pin.coordinate?.longitude !== 'number') {
      console.warn('[PinModal] Invalid coordinates for navigation', pin?.coordinate);
      Alert.alert(t('pinModal.errorTitle'), t('pinModal.errorInvalidCoordinatesNav'));
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
      Alert.alert(t('pinModal.expiredPinTitle'), t('pinModal.expiredPinRouteMessage'));
      return;
    }

    // Safety check: coordinates must be valid
    if (!pin || !userLocation) {
      Alert.alert(t('pinModal.errorTitle'), t('pinModal.errorRouteLocationMissing'));
      return;
    }

    if (
      typeof pin.coordinate?.latitude !== 'number' ||
      typeof pin.coordinate?.longitude !== 'number' ||
      typeof userLocation.latitude !== 'number' ||
      typeof userLocation.longitude !== 'number'
    ) {
      console.warn('[PinModal] Invalid coordinates for route', { pin: pin?.coordinate, userLocation });
      Alert.alert(t('pinModal.errorTitle'), t('pinModal.errorInvalidCoordinatesRoute'));
      return;
    }

    // Call parent route handler
    if (onShowRoute) {
      onShowRoute();
    }
  };

  const handleRequestReservation = async () => {
    if (!pin || !user?.uid) {
      Alert.alert(t('pinModal.loginRequiredTitle'), t('pinModal.loginRequiredMessage'));
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
      Alert.alert(t('pinModal.requestSentTitle'), t('pinModal.requestSentMessage'));
    } catch (error: any) {
      console.error('[PinModal] Error requesting reservation:', error);
      Alert.alert(t('pinModal.requestFailedTitle'), error.message || t('pinModal.loginRequiredMessage'));
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
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>{t('pinModal.loadingUser')}</Text>
    </View>
  ) : !authorProfile && (
    <View style={styles.trustRowMissing}>
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>{t('pinModal.unknownUser')}</Text>
    </View>
  )}
  {authorProfile && (
    <View style={styles.trustRow}>
      {/* DisplayName always for both types */}
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>{t('pinModal.source')}</Text>
      <Text style={[styles.trustValue, { color: textColor }]}>
        {authorProfile.displayName?.trim() || t('pinModal.anonymous')}
      </Text>
    </View>
  )}
  {/* Show vehicle info for leaving-soon only and only on user fetch success */}
  {authorProfile && pin.type === 'leaving-soon' && (
    <View style={styles.trustRow}>
      <Text style={[styles.trustLabel, { color: textSecondaryColor }]}>{t('pinModal.vehicle')}</Text>
      <Text style={[styles.trustValue, { color: textColor }]}>
        {/* show as one line, only fields that exist, else fallback */}
        {authorProfile.vehicleBrand || authorProfile.vehicleModel || authorProfile.vehicleColor
          ? [authorProfile.vehicleBrand, authorProfile.vehicleModel, authorProfile.vehicleColor].filter(Boolean).join(' ')
          : t('pinModal.notSpecified')}
      </Text>
    </View>
  )}
            </View>

            <View style={styles.modalBody}>
            {/* Title (if available) */}

            {/* Description (if non-empty) */}
{pin.description && pin.description.trim() !== '' && (
  <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
    <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.description')}</Text>
    <Text style={[styles.infoValue, { color: textColor }]}>{pin.description}</Text>
  </View>
)}

            {/* Pin Type */}
            <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.type')}</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>{pinTypeLabel}</Text>
            </View>

            {/* Time until available */}
            <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.availability')}</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>{willLeaveText}</Text>
            </View>

            {/* Expiration Countdown */}
            {timeRemaining !== null && !(isReservationApproved && isReservationRequester) && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.expiresIn')}</Text>
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
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.distance')}</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>{formatDistance(distance)}</Text>
              </View>
            )}

            {/* Status */}

            {/* Paid/Free */}
            <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.payment')}</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {pin.isPaid ? t('pinModal.paid') : t('pinModal.free')}
              </Text>
            </View>

            {!!reservationStatus && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.reservation')}</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>
                  {reservationStatus === 'pending'
                    ? isReservationRequester
                      ? t('pinModal.pendingYouRequested')
                      : t('pinModal.reservationPending')
                    : reservationStatus === 'approved'
                    ? isReservationRequester
                      ? t('pinModal.approvedForYou')
                      : t('pinModal.approved')
                    : reservationStatus === 'rejected'
                    ? t('pinModal.rejected')
                    : t('pinModal.expired')}
                </Text>
              </View>
            )}

            {isReservationApproved && isReservationRequester && timeRemaining !== null && (
              <View style={[styles.infoRow, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{t('pinModal.arriveWithin')}</Text>
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
                title={t('pinModal.edit')}
                onPress={handleEdit}
                variant="primary"
                disabled={deleting}
                style={styles.ownerButton}
              />
              <Button
                title={t('pinModal.delete')}
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
              title={hasRoute ? t('pinModal.hideRoute') : t('pinModal.showRoute')}
              onPress={handleRouteToggle}
              variant={hasRoute ? 'danger' : 'success'}
              disabled={!canShowRoute}
              style={styles.actionButton}
            />
          )}

          {/* Request Reservation Button (premium-only, leaving-soon) */}
          {pin.type === 'leaving-soon' && !isOwner && (
            <Button
              title={isPremium ? t('pinModal.requestReservation') : t('pinModal.requestReservationPremium')}
              onPress={handleRequestReservation}
              variant="primary"
              loading={reservationLoading}
              disabled={reservationButtonDisabled}
              style={styles.actionButton}
            />
          )}

            {/* Navigate Button (premium-only) */}
            <Button
              title={isExpired ? t('pinModal.expired') : isPremium ? t('pinModal.navigate') : t('pinModal.navigatePremium')}
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
        message={t('pinModal.upgradeMessage')}
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




