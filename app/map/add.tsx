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
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/hooks/useAuth';
import { createParkingSpot, getUserParkingSpots } from '@/services/parkingService';
import { PinType, ParkingStatus } from '@/models/firestore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AddParkingSpotScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    latitude: string;
    longitude: string;
  }>();

  const [description, setDescription] = useState<string | undefined>('');
  const [selectedPinType, setSelectedPinType] = useState<PinType | null>(null);
  const [willLeaveInMinutes, setWillLeaveInMinutes] = useState<number>(15); // Default 15 minutes for leaving-soon
  const [isPaid, setIsPaid] = useState<boolean>(false); // Default to Free
  const [loading, setLoading] = useState(false);
  const [checkingLeavingSoon, setCheckingLeavingSoon] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const dividerColor = useThemeColor({}, 'divider');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  // Get coordinates from params
  const latitude = params.latitude ? parseFloat(params.latitude) : null;
  const longitude = params.longitude ? parseFloat(params.longitude) : null;

  // Validation
  const validateForm = (): string | null => {
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
        // Only include description field if it is a non-empty string
        ...(description && description.trim() ? { description: description.trim() } : {}),
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
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={[styles.cancelButton, { backgroundColor: dividerColor }]}>
              <Ionicons name="close" size={24} color={textSecondaryColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tintColor }]}>Add Parking Spot</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
          {/* Description Input (optional) */}
          <Card>
            <Text style={[styles.label, { color: textColor }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
              ]}
              placeholder="Describe this parking spot (optional)"
              placeholderTextColor={textSecondaryColor}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!loading}
            />
          </Card>


          {/* Pin Type Selection */}
          <Card>
            <Text style={[styles.label, { color: textColor }]}>Pin Type *</Text>
            <View style={styles.pinTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.pinTypeButton,
                  { backgroundColor: inputBackground, borderColor: inputBorder },
                  selectedPinType === 'walk-in' && { backgroundColor: tintColor, borderColor: tintColor },
                ]}
                onPress={() => setSelectedPinType('walk-in')}
                disabled={loading}
              >
                <Ionicons
                  name="walk"
                  size={24}
                  color={selectedPinType === 'walk-in' ? '#fff' : tintColor}
                />
                <Text
                  style={[
                    styles.pinTypeText,
                    { color: selectedPinType === 'walk-in' ? '#fff' : tintColor },
                  ]}
                >
                  Walk-In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pinTypeButton,
                  { backgroundColor: inputBackground, borderColor: inputBorder },
                  selectedPinType === 'leaving-soon' && { backgroundColor: errorColor, borderColor: errorColor },
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
                  color={selectedPinType === 'leaving-soon' ? '#fff' : errorColor}
                />
                <Text
                  style={[
                    styles.pinTypeText,
                    { color: selectedPinType === 'leaving-soon' ? '#fff' : errorColor },
                  ]}
                >
                  Leaving Soon
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Leaving Soon Time Selector */}
          {selectedPinType === 'leaving-soon' && (
            <Card>
              <Text style={[styles.label, { color: textColor }]}>Approximate Leaving Time *</Text>
              <View style={styles.timeSelectorContainer}>
                {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.timeButton,
                      { backgroundColor: inputBackground, borderColor: inputBorder },
                      willLeaveInMinutes === minutes && { backgroundColor: tintColor, borderColor: tintColor },
                    ]}
                    onPress={() => setWillLeaveInMinutes(minutes)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        { color: willLeaveInMinutes === minutes ? '#fff' : tintColor },
                      ]}
                    >
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.hintText, { color: textSecondaryColor }]}>
                Select when you plan to leave this parking spot
              </Text>
            </Card>
          )}

          {/* Paid/Free Selection */}
          <Card>
            <Text style={[styles.label, { color: textColor }]}>Payment Type *</Text>
            <View style={styles.paymentContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  { backgroundColor: inputBackground, borderColor: inputBorder },
                  !isPaid && { backgroundColor: tintColor, borderColor: tintColor },
                ]}
                onPress={() => setIsPaid(false)}
                disabled={loading}
              >
                <Ionicons
                  name="cash"
                  size={24}
                  color={!isPaid ? '#fff' : tintColor}
                />
                <Text
                  style={[
                    styles.paymentText,
                    { color: !isPaid ? '#fff' : tintColor },
                  ]}
                >
                  Free
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  { backgroundColor: inputBackground, borderColor: inputBorder },
                  isPaid && { backgroundColor: tintColor, borderColor: tintColor },
                ]}
                onPress={() => setIsPaid(true)}
                disabled={loading}
              >
                <Ionicons
                  name="card"
                  size={24}
                  color={isPaid ? '#fff' : tintColor}
                />
                <Text
                  style={[
                    styles.paymentText,
                    { color: isPaid ? '#fff' : tintColor },
                  ]}
                >
                  Paid
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Submit Button */}
          <Button
            title="Create Parking Spot"
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 20 : 10,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flexGrow: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pinTypeText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinTypeButtonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    marginTop: 10,
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
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

