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
} from 'react-native';
import { router } from 'expo-router';
import { MapPin } from './useMapPins';
import { getUserById } from '@/services/userService';
import { User } from '@/models/firestore';
import { useAuth } from '@/hooks/useAuth';
import { deleteParkingSpot } from '@/services/parkingService';

interface PinModalProps {
  visible: boolean;
  pin: MapPin | null;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onNavigate?: () => void;
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
}: PinModalProps) {
  const { user } = useAuth();
  const [authorProfile, setAuthorProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Check if current user is the owner
  const isOwner = user?.uid === pin?.authorId;

  // Calculate time remaining until expiration
  useEffect(() => {
    if (!pin || !pin.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = Date.now();
      const remaining = pin.expiresAt - now;
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    // Update immediately
    updateTimeRemaining();

    // Update every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [pin?.expiresAt]);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pin.title || pinTypeLabel}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Title (if available) */}
            {pin.title && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Title:</Text>
                <Text style={styles.infoValue}>{pin.title}</Text>
              </View>
            )}

            {/* Description (if available) */}
            {pin.description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description:</Text>
                <Text style={styles.infoValue}>{pin.description}</Text>
              </View>
            )}

            {/* Pin Type */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{pinTypeLabel}</Text>
            </View>

            {/* Time until available */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Availability:</Text>
              <Text style={styles.infoValue}>{willLeaveText}</Text>
            </View>

            {/* Expiration Countdown */}
            {timeRemaining !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expires in:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    timeRemaining <= 60000 && styles.expiringSoon, // Red if less than 1 minute
                  ]}
                >
                  {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>
            )}

            {/* User Reputation Score */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reputation Score:</Text>
              {loadingProfile ? (
                <ActivityIndicator size="small" color="#2f95dc" />
              ) : (
                <Text style={styles.infoValue}>
                  {authorProfile?.reliabilityScore ?? 'N/A'}
                </Text>
              )}
            </View>

            {/* Distance */}
            {distance !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Distance:</Text>
                <Text style={styles.infoValue}>{formatDistance(distance)}</Text>
              </View>
            )}

            {/* Status */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{pin.status}</Text>
            </View>

            {/* Paid/Free */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment:</Text>
              <Text style={styles.infoValue}>
                {pin.isPaid ? 'Paid' : 'Free'}
              </Text>
            </View>
          </View>

          {/* Owner Controls */}
          {isOwner && (
            <View style={styles.ownerControls}>
              <TouchableOpacity
                style={[styles.ownerButton, styles.editButton]}
                onPress={handleEdit}
                disabled={deleting}
              >
                <Text style={styles.ownerButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ownerButton, styles.deleteButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.ownerButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Navigate Button (disabled for now) */}
          <TouchableOpacity
            style={[styles.navigateButton, styles.navigateButtonDisabled]}
            onPress={onNavigate}
            disabled
          >
            <Text style={styles.navigateButtonText}>Navigate (Coming Soon)</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
    color: '#2f95dc',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
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
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  navigateButton: {
    backgroundColor: '#2f95dc',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  navigateButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ownerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  ownerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2f95dc',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  ownerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expiringSoon: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
});

export default PinModal;




