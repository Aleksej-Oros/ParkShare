/**
 * EditParkingSpotScreen
 * Form for editing an existing parking spot pin
 * Only accessible by the pin owner
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useAuth } from '@/hooks/useAuth';
import { getParkingSpotById, updateParkingSpot } from '@/services/parkingService';
import { ParkingSpot, PinType, ParkingStatus } from '@/models/firestore';

export default function EditParkingSpotScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ spotId: string }>();
  const spotId = params.spotId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPinType, setSelectedPinType] = useState<PinType | null>(null);
  const [willLeaveInMinutes, setWillLeaveInMinutes] = useState<number>(15);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState<{
    title: string;
    description: string;
    pinType: PinType | null;
    willLeaveIn: number;
    isPaid: boolean;
  } | null>(null);

  // Load spot data
  useEffect(() => {
    if (!spotId) {
      Alert.alert('Error', 'Invalid spot ID');
      router.back();
      return;
    }

    const loadSpot = async () => {
      try {
        const spotData = await getParkingSpotById(spotId);
        if (!spotData) {
          Alert.alert('Error', 'Parking spot not found');
          router.back();
          return;
        }

        // Check ownership
        if (spotData.userId !== user?.uid) {
          Alert.alert('Error', 'You do not have permission to edit this parking spot');
          router.back();
          return;
        }

        setSpot(spotData);
        const titleValue = spotData.title || '';
        const descriptionValue = spotData.description || '';
        const pinTypeValue = spotData.pinType;
        const willLeaveInValue = spotData.willLeaveIn || 15;
        const isPaidValue = spotData.isPaid || false;
        
        setTitle(titleValue);
        setDescription(descriptionValue);
        setSelectedPinType(pinTypeValue);
        setWillLeaveInMinutes(willLeaveInValue);
        setIsPaid(isPaidValue);
        
        // Store original values for change detection
        setOriginalValues({
          title: titleValue,
          description: descriptionValue,
          pinType: pinTypeValue,
          willLeaveIn: willLeaveInValue,
          isPaid: isPaidValue,
        });
      } catch (error: any) {
        console.error('[EditParkingSpotScreen] Error loading spot:', error);
        Alert.alert('Error', error.message || 'Failed to load parking spot');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadSpot();
  }, [spotId, user?.uid]);

  // Validation
  const validateForm = (): string | null => {
    if (!title || title.trim().length <= 3) {
      return 'Title must be longer than 3 characters';
    }
    if (!description || description.trim().length <= 10) {
      return 'Description must be longer than 10 characters';
    }
    if (!selectedPinType) {
      return 'Please select a pin type';
    }
    if (!user?.uid) {
      return 'You must be logged in to edit a pin';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (!user?.uid || !spotId || !selectedPinType || !spot) {
      return;
    }

    setSaving(true);

    try {
      const pinType: PinType = selectedPinType!;
      
      // Determine status based on pin type
      let status: ParkingStatus;
      if (pinType === 'walk-in') {
        status = 'walk_in_pending';
      } else {
        status = 'leaving_soon_active';
      }

      // Calculate expiresAt: extend from NOW, not from createdAt
      // This ensures the pin doesn't disappear if it was created a while ago
      const now = Date.now();
      let expiresAt: number;
      let willLeaveIn: number;
      
      if (pinType === 'walk-in') {
        // Walk-in: expiresAt = now + 10 minutes
        willLeaveIn = 10;
        expiresAt = now + willLeaveIn * 60 * 1000;
      } else {
        // Leaving-soon: expiresAt = now + willLeaveIn minutes
        willLeaveIn = willLeaveInMinutes;
        if (willLeaveIn < 2 || willLeaveIn > 60) {
          throw new Error('Leaving time must be between 2 and 60 minutes');
        }
        expiresAt = now + willLeaveIn * 60 * 1000;
      }

      // Update parking spot - always set willLeaveIn to prevent undefined
      await updateParkingSpot(spotId, user.uid, {
        title: title.trim(),
        description: description.trim(),
        pinType,
        status,
        willLeaveIn, // Always set, never undefined
        expiresAt,
        isPaid, // User-selected: Free or Paid
      });

      // Success - navigate back
      Alert.alert('Success', 'Parking spot updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[EditParkingSpotScreen] Error updating pin:', error);
      Alert.alert('Error', error.message || 'Failed to update parking spot');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2f95dc" style={styles.loader} />
        <Text style={styles.loadingText}>Loading parking spot...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Parking Spot</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.form}>
          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter spot title (min. 4 characters)"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              editable={!saving}
            />
            {title.length > 0 && title.length <= 3 && (
              <Text style={styles.errorText}>Title must be longer than 3 characters</Text>
            )}
          </View>

          {/* Description Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the parking spot (min. 11 characters)"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!saving}
            />
            {description.length > 0 && description.length <= 10 && (
              <Text style={styles.errorText}>Description must be longer than 10 characters</Text>
            )}
          </View>

          {/* Pin Type Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pin Type *</Text>
            <View style={styles.pinTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.pinTypeButton,
                  selectedPinType === 'walk-in' && styles.pinTypeButtonSelected,
                ]}
                onPress={() => setSelectedPinType('walk-in')}
                disabled={saving}
              >
                <Ionicons
                  name="walk"
                  size={24}
                  color={selectedPinType === 'walk-in' ? '#fff' : '#2f95dc'}
                />
                <Text
                  style={[
                    styles.pinTypeText,
                    selectedPinType === 'walk-in' && styles.pinTypeTextSelected,
                  ]}
                >
                  Walk-In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pinTypeButton,
                  selectedPinType === 'leaving-soon' && styles.pinTypeButtonSelected,
                ]}
                onPress={() => setSelectedPinType('leaving-soon')}
                disabled={saving}
              >
                <Ionicons
                  name="time"
                  size={24}
                  color={selectedPinType === 'leaving-soon' ? '#fff' : '#FF4444'}
                />
                <Text
                  style={[
                    styles.pinTypeText,
                    selectedPinType === 'leaving-soon' && styles.pinTypeTextSelected,
                  ]}
                >
                  Leaving Soon
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Leaving Soon Time Selector */}
          {selectedPinType === 'leaving-soon' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Approximate Leaving Time *</Text>
              <View style={styles.timeSelectorContainer}>
                {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeButton,
                      willLeaveInMinutes === minutes && styles.timeButtonSelected,
                    ]}
                    onPress={() => setWillLeaveInMinutes(minutes)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        willLeaveInMinutes === minutes && styles.timeButtonTextSelected,
                      ]}
                    >
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>
                Select when you plan to leave this parking spot
              </Text>
            </View>
          )}

          {/* Paid/Free Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Payment Type *</Text>
            <View style={styles.paymentContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  !isPaid && styles.paymentButtonSelected,
                ]}
                onPress={() => setIsPaid(false)}
                disabled={saving}
              >
                <Ionicons
                  name="cash"
                  size={24}
                  color={!isPaid ? '#fff' : '#2f95dc'}
                />
                <Text
                  style={[
                    styles.paymentText,
                    !isPaid && styles.paymentTextSelected,
                  ]}
                >
                  Free
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  isPaid && styles.paymentButtonSelected,
                ]}
                onPress={() => setIsPaid(true)}
                disabled={saving}
              >
                <Ionicons
                  name="card"
                  size={24}
                  color={isPaid ? '#fff' : '#2f95dc'}
                />
                <Text
                  style={[
                    styles.paymentText,
                    isPaid && styles.paymentTextSelected,
                  ]}
                >
                  Paid
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          {(() => {
            // Check if any values have changed
            const hasChanges = originalValues ? (
              title.trim() !== originalValues.title ||
              description.trim() !== originalValues.description ||
              selectedPinType !== originalValues.pinType ||
              (selectedPinType === 'leaving-soon' && willLeaveInMinutes !== originalValues.willLeaveIn) ||
              isPaid !== originalValues.isPaid
            ) : true; // If no original values, allow save (shouldn't happen, but safety check)
            
            return (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (saving || !hasChanges) && styles.submitButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  loader: {
    marginTop: '50%',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 50 : 20,
  },
  cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2f95dc',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  pinTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pinTypeButton: {
    flex: 1,
    height: 100,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pinTypeButtonSelected: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  pinTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f95dc',
  },
  pinTypeTextSelected: {
    color: '#fff',
  },
  submitButton: {
    height: 50,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  timeButtonSelected: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f95dc',
  },
  timeButtonTextSelected: {
    color: '#fff',
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  paymentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    height: 80,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paymentButtonSelected: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f95dc',
  },
  paymentTextSelected: {
    color: '#fff',
  },
});

