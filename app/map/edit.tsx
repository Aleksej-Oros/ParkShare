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
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/hooks/useAuth';
import { getParkingSpotById, updateParkingSpot } from '@/services/parkingService';
import { ParkingSpot, PinType, ParkingStatus } from '@/models/firestore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocale } from '@/context/LocaleContext';

export default function EditParkingSpotScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const params = useLocalSearchParams<{ spotId: string }>();
  const spotId = params.spotId;

  const [description, setDescription] = useState<string>(''); // ALWAYS string
  const [selectedPinType, setSelectedPinType] = useState<PinType | null>(null);
  const [willLeaveInMinutes, setWillLeaveInMinutes] = useState<number>(15);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spot, setSpot] = useState<ParkingSpot | null>(null);

  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const dividerColor = useThemeColor({}, 'divider');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  const [originalValues, setOriginalValues] = useState<{
    description: string;
    pinType: PinType | null;
    willLeaveIn: number;
    isPaid: boolean;
  } | null>(null);

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

        if (spotData.userId !== user?.uid) {
          Alert.alert('Error', 'You do not have permission to edit this parking spot');
          router.back();
          return;
        }

        setSpot(spotData);

        const descriptionValue = spotData.description ?? '';
        const pinTypeValue = spotData.pinType;
        const willLeaveInValue = spotData.willLeaveIn || 15;
        const isPaidValue = spotData.isPaid || false;

        setDescription(descriptionValue);
        setSelectedPinType(pinTypeValue);
        setWillLeaveInMinutes(willLeaveInValue);
        setIsPaid(isPaidValue);

        setOriginalValues({
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

  const validateForm = (): string | null => {
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
      const pinType: PinType = selectedPinType;
      const isPinTypeChanged = pinType !== spot.pinType;
      const isLeavingSoon = pinType === 'leaving-soon';
      const isTimeChanged =
        isLeavingSoon && typeof spot.willLeaveIn === 'number'
          ? willLeaveInMinutes !== spot.willLeaveIn
          : isLeavingSoon;

      const updates: {
        description?: string;
        pinType?: PinType;
        status?: ParkingStatus;
        willLeaveIn?: number;
        expiresAt?: number;
        isPaid?: boolean;
      } = {
        // Always send description as a string (empty string if cleared)
        description: typeof description === 'string' ? description : '',
        isPaid,
      };

      if (isPinTypeChanged) {
        updates.pinType = pinType;
      }

      if (isPinTypeChanged || isTimeChanged) {
        const now = Date.now();
        if (pinType === 'walk-in') {
          const willLeaveIn = 10;
          updates.willLeaveIn = willLeaveIn;
          updates.expiresAt = now + willLeaveIn * 60 * 1000;
          updates.status = 'walk_in_pending';
        } else {
          const willLeaveIn = willLeaveInMinutes;
          if (willLeaveIn < 2 || willLeaveIn > 60) {
            throw new Error('Leaving time must be between 2 and 60 minutes');
          }
          updates.willLeaveIn = willLeaveIn;
          updates.expiresAt = now + willLeaveIn * 60 * 1000;
          updates.status = 'leaving_soon_active';
        }
      }

      await updateParkingSpot(spotId, user.uid, updates);

      Alert.alert('Success', 'Parking spot updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[EditParkingSpotScreen] Error updating pin:', error);
      Alert.alert('Error', error.message || 'Failed to update parking spot');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>Loading parking spot...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasChanges = originalValues
    ? description.trim() !== originalValues.description.trim() ||
      selectedPinType !== originalValues.pinType ||
      (selectedPinType === 'leaving-soon' &&
        willLeaveInMinutes !== originalValues.willLeaveIn) ||
      isPaid !== originalValues.isPaid
    : true;

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
            <TouchableOpacity onPress={() => router.back()} style={[styles.cancelButton, { backgroundColor: dividerColor }]}>
              <Ionicons name="close" size={24} color={textSecondaryColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: tintColor }]}>{t('map.editParkingSpot')}</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            {/* Description Input (optional) */}
            <Card>
              <Text style={[styles.label, { color: textColor }]}>Description (optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                ]}
                placeholder="Add optional details"
                placeholderTextColor={textSecondaryColor}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!saving}
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
                  disabled={saving}
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
                  ]}
                  onPress={() => setSelectedPinType('leaving-soon')}
                  disabled={saving}
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
                      disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
              title="Save Changes"
              onPress={handleSave}
              variant="primary"
              loading={saving}
              disabled={!hasChanges || saving}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingText: {
    marginTop: 12,
    textAlign: 'center',
  },
});
