/**
 * AddParkingSpotScreen
 * Form for creating a new parking spot pin
 */
import React, { useState } from 'react';
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
import { createParkingSpot, getUserParkingSpots } from '@/services/parkingService';
import { PinType, ParkingStatus } from '@/models/firestore';

export default function AddParkingSpotScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    latitude: string;
    longitude: string;
  }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPinType, setSelectedPinType] = useState<PinType | null>(null);
  const [willLeaveInMinutes, setWillLeaveInMinutes] = useState<number>(15); // Default 15 minutes for leaving-soon
  const [isPaid, setIsPaid] = useState<boolean>(false); // Default to Free
  const [loading, setLoading] = useState(false);
  const [checkingLeavingSoon, setCheckingLeavingSoon] = useState(false);

  // Get coordinates from params
  const latitude = params.latitude ? parseFloat(params.latitude) : null;
  const longitude = params.longitude ? parseFloat(params.longitude) : null;

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
    if (!latitude || !longitude) {
      return 'Invalid location coordinates';
    }
    if (!user?.uid) {
      return 'You must be logged in to create a pin';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (!user?.uid || !latitude || !longitude || !selectedPinType) {
      return;
    }

    setLoading(true);

    try {
      const pinType: PinType = selectedPinType!;
      
      // Calculate createdAt and expiresAt based on pin type
      const createdAt = Date.now();
      let expiresAt: number;
      let status: ParkingStatus;
      
      let willLeaveIn: number;
      if (pinType === 'walk-in') {
        // Walk-in: expiresAt = createdAt + 10 minutes, willLeaveIn = 10
        willLeaveIn = 10; // Default 10 minutes for walk-in
        expiresAt = createdAt + willLeaveIn * 60 * 1000;
        status = 'walk_in_pending';
      } else {
        // Leaving-soon: expiresAt = createdAt + userSelectedMinutes
        willLeaveIn = willLeaveInMinutes;
        if (willLeaveIn < 2 || willLeaveIn > 60) {
          throw new Error('Leaving time must be between 2 and 60 minutes');
        }
        expiresAt = createdAt + willLeaveIn * 60 * 1000;
        status = 'leaving_soon_active';
        
        // Server-side check: prevent multiple leaving-soon pins
        const userSpots = await getUserParkingSpots(user.uid, false);
        const activeLeavingSoon = userSpots.filter(
          (spot) => 
            spot.pinType === 'leaving-soon' && 
            spot.status === 'leaving_soon_active' &&
            spot.expiresAt > Date.now()
        );
        
        if (activeLeavingSoon.length > 0) {
          throw new Error('You already have an active Leaving Soon pin.');
        }
      }

      // Create parking spot - willLeaveIn is always set (never undefined)
      await createParkingSpot({
        userId: user.uid,
        location: {
          latitude,
          longitude,
        },
        pinType,
        willLeaveIn, // Always set: 10 for walk-in, user value for leaving-soon
        isPaid, // User-selected: Free or Paid
        status,
        expiresAt,
        createdAt,
        priorityScore: 0,
        // Store title and description
        title: title.trim(),
        description: description.trim(),
      });

      // Success - navigate back
      Alert.alert('Success', 'Parking spot created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[AddParkingSpotScreen] Error creating pin:', error);
      Alert.alert('Error', error.message || 'Failed to create parking spot');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

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
          <Text style={styles.headerTitle}>Add Parking Spot</Text>
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
              editable={!loading}
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
              editable={!loading}
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
                disabled={loading}
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
                  checkingLeavingSoon && styles.pinTypeButtonDisabled,
                ]}
                onPress={async () => {
                  if (loading || checkingLeavingSoon) return;
                  
                  // Check if user already has active leaving-soon pin
                  if (user?.uid) {
                    setCheckingLeavingSoon(true);
                    try {
                      const userSpots = await getUserParkingSpots(user.uid, false);
                      const activeLeavingSoon = userSpots.filter(
                        (spot) => 
                          spot.pinType === 'leaving-soon' && 
                          spot.status === 'leaving_soon_active' &&
                          spot.expiresAt > Date.now()
                      );
                      
                      if (activeLeavingSoon.length > 0) {
                        Alert.alert(
                          'Cannot Create Pin',
                          'You already have an active Leaving Soon pin. Please wait until it expires before creating another one.'
                        );
                        setCheckingLeavingSoon(false);
                        return;
                      }
                    } catch (error: any) {
                      console.error('[AddParkingSpotScreen] Error checking leaving-soon pins:', error);
                      // Allow selection if check fails (don't block user)
                    } finally {
                      setCheckingLeavingSoon(false);
                    }
                  }
                  
                  setSelectedPinType('leaving-soon');
                }}
                disabled={loading || checkingLeavingSoon}
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
                    disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Parking Spot</Text>
            )}
          </TouchableOpacity>
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
  pinTypeButtonDisabled: {
    opacity: 0.5,
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
});

