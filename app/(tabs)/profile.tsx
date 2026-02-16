import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { View, StyleSheet, TouchableOpacity, Alert, SafeAreaView, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { logout } from '@/features/auth/authSlice';
import { AppDispatch } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { updateUser } from '@/services/userService';
import { isValidBrand, isValidModelForBrand, getModelsForBrand } from '@/utils/vehicleData';
import {
  premiumMonthlyPrice,
  premiumCurrency,
  premiumBillingPeriod,
} from '@/config/premiumConfig';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeColor } from '@/components/Themed';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user: authUser } = useAuth();
  const { profile } = useProfile(authUser?.uid ?? null);
  const { isPremium, loading: premiumLoading } = usePremiumAccess();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingBrand, setEditingBrand] = useState('');
  const [editingModel, setEditingModel] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ brand?: string; model?: string; color?: string }>({});
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'account'>('overview');
  const hasSetBenefitsDefault = useRef(false);
  
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;
  const successColor = Colors[colorScheme].success;
  
  // Reload profile on mount to ensure fresh data
  useEffect(() => {
    if (authUser) {
      // Profile updates are handled through React state/effect on save.
    }
  }, [authUser]);

  // Initialize editing fields when entering edit mode
  useEffect(() => {
    if (isEditing && profile) {
      setEditingBrand(profile.vehicleBrand || '');
      setEditingModel(profile.vehicleModel || '');
      setEditingColor(profile.vehicleColor || '');
      if (profile.vehicleBrand && isValidBrand(profile.vehicleBrand)) {
        setAvailableModels(getModelsForBrand(profile.vehicleBrand));
      }
    }
  }, [isEditing, profile]);
  
  // Use profile data if available, fallback to auth user
  const displayName = profile?.displayName || authUser?.displayName || '-';
  const email = authUser?.email || '-';
  const vehicleBrand = profile?.vehicleBrand || '';
  const vehicleModel = profile?.vehicleModel || '';
  const vehicleColor = profile?.vehicleColor || '';
  const leavingSoonTarget = 20;
  // TODO: replace with monthly leaving-soon share count from backend stats.
  const leavingSoonSharedThisMonth = profile?.leavingSoonSharesThisMonth ?? 0;
  const leavingSoonProgress = Math.min(
    Math.max(leavingSoonSharedThisMonth, 0) / leavingSoonTarget,
    1
  );
  const leavingSoonProgressPercent = Math.round(leavingSoonProgress * 100);
  const hasRewardUnlocked = leavingSoonSharedThisMonth >= leavingSoonTarget;

  useEffect(() => {
    if (!hasSetBenefitsDefault.current && !premiumLoading) {
      setIsBenefitsExpanded(!isPremium);
      hasSetBenefitsDefault.current = true;
    }
  }, [isPremium, premiumLoading]);

  const handleSave = async () => {
    // Validate
    const newErrors: { brand?: string; model?: string; color?: string } = {};
    
    if (!editingBrand.trim()) {
      newErrors.brand = 'Vehicle brand is required';
    } else if (!isValidBrand(editingBrand)) {
      newErrors.brand = 'Please enter a valid vehicle brand';
    }
    
    if (!editingModel.trim()) {
      newErrors.model = 'Vehicle model is required';
    } else if (editingBrand.trim() && !isValidModelForBrand(editingBrand, editingModel)) {
      newErrors.model = `"${editingModel}" is not a valid model for ${editingBrand}`;
    }
    
    if (!editingColor.trim()) {
      newErrors.color = 'Vehicle color is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!authUser?.uid) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    setSaving(true);
    try {
      await updateUser(authUser.uid, {
        vehicleBrand: editingBrand.trim(),
        vehicleModel: editingModel.trim(),
        vehicleColor: editingColor.trim(),
      });
      setIsEditing(false);
      setErrors({});
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('[ProfileScreen] Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      // The global listener will redirect to login
    } catch (e: any) {
      Alert.alert('Logout Failed', e.message || 'Could not log out.');
    }
  };

  const handleCancelPremium = () => {
    // Placeholder for future subscription management.
    Alert.alert(
      'Manage subscription',
      'Subscription management will be available soon. You can cancel any time from here.'
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: tintColor }]}>Profile</Text>

          <View style={[styles.segmentedControl, { backgroundColor: cardBackground, borderColor: tintColor + '55' }]}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSection === 'overview' && { backgroundColor: tintColor + '25', borderColor: tintColor + '66' },
              ]}
              onPress={() => setActiveSection('overview')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentButtonText, { color: activeSection === 'overview' ? tintColor : textSecondaryColor }]}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSection === 'account' && { backgroundColor: tintColor + '25', borderColor: tintColor + '66' },
              ]}
              onPress={() => setActiveSection('account')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentButtonText, { color: activeSection === 'account' ? tintColor : textSecondaryColor }]}>
                Account
              </Text>
            </TouchableOpacity>
          </View>

          {activeSection === 'overview' && (
            <>
          <Card variant="premium" style={{ borderColor: tintColor + '55' }}>
            {premiumLoading ? (
              <>
                <Text style={[styles.cardTitle, { color: textColor }]}>Premium Status</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>Checking your status...</Text>
              </>
            ) : isPremium ? (
              <>
                <Text style={[styles.cardTitle, { color: textColor }]}>Premium Driver ⭐</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>Premium active</Text>
                <TouchableOpacity
                  style={[styles.cancelPremiumButton, { backgroundColor: cardBackground, borderColor: inputBorder }]}
                  onPress={handleCancelPremium}
                >
                  <Text style={[styles.cancelPremiumButtonText, { color: textColor }]}>Cancel Premium</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.cardTitle, { color: textColor }]}>Upgrade to Premium</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
                  Reserve spots, navigate faster, earn rewards
                </Text>
                <TouchableOpacity
                  style={[styles.premiumButton, { backgroundColor: tintColor }]}
                  onPress={() => router.push('/modal')}
                >
                  <Text style={styles.premiumButtonText}>Go Premium</Text>
                </TouchableOpacity>
                <Text style={[styles.premiumPriceText, { color: textSecondaryColor }]}>
                  {premiumMonthlyPrice} {premiumCurrency} / {premiumBillingPeriod}
                </Text>
                <Text style={[styles.premiumNoteText, { color: textSecondaryColor }]}>Cancel anytime</Text>
              </>
            )}
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setIsBenefitsExpanded((prev) => !prev)}
            >
              <Text style={[styles.sectionTitle, { color: textColor }]}>What you get with Premium</Text>
              <Text style={[styles.collapsibleIcon, { color: tintColor }]}>
                {isBenefitsExpanded ? '-' : '+'}
              </Text>
            </TouchableOpacity>
            {isBenefitsExpanded ? (
              <View style={styles.benefitsList}>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>Reserve parking spots before they free up</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>In-app route navigation to pins</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>Instant pin visibility (no delay)</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>Priority access to shared spots</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>Monthly rewards & discounts</Text>
                </View>
              </View>
            ) : null}
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Your Activity This Month</Text>
            <View style={[styles.progressBarTrack, { backgroundColor: inputBorder }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${leavingSoonProgressPercent}%`, backgroundColor: tintColor },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: textSecondaryColor }]}>
              {leavingSoonSharedThisMonth} / {leavingSoonTarget} Leaving Soon spots shared
            </Text>
            {hasRewardUnlocked ? (
              <Text style={[styles.rewardText, { color: successColor }]}>🎉 You earned 50% off next month!</Text>
            ) : null}
            {!isPremium && (
              <Text style={[styles.noteText, { color: textSecondaryColor }]}>
                Premium users can unlock discounts through sharing.
              </Text>
            )}
          </Card>
            </>
          )}
          
          {activeSection === 'account' && (
            <>
          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered, { color: tintColor }]}>User</Text>
            <View style={styles.section}>
              <Text style={[styles.label, { color: textSecondaryColor }]}>Name:</Text>
              <Text style={[styles.value, { color: textColor }]}>{displayName}</Text>
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { color: textSecondaryColor }]}>Email:</Text>
              <Text style={[styles.value, { color: textColor }]}>{email}</Text>
            </View>
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered, { color: tintColor }]}>Vehicle</Text>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.label, { color: textSecondaryColor }]}>Details</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                    <Text style={[styles.editButtonText, { color: tintColor }]}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isEditing ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>Brand *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.brand ? { borderColor: errorColor } : null,
                      ]}
                      placeholder="e.g., Toyota, Honda, BMW"
                      placeholderTextColor={textSecondaryColor}
                      value={editingBrand}
                      onChangeText={(text) => {
                        setEditingBrand(text);
                        if (text.trim() && isValidBrand(text)) {
                          setAvailableModels(getModelsForBrand(text));
                        } else {
                          setAvailableModels([]);
                        }
                        if (editingModel) {
                          setEditingModel('');
                        }
                        if (errors.brand) {
                          setErrors({ ...errors, brand: undefined });
                        }
                      }}
                      autoCapitalize="words"
                      editable={!saving}
                    />
                    {errors.brand ? <Text style={[styles.errorText, { color: errorColor }]}>{errors.brand}</Text> : null}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>Model *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.model ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={editingBrand.trim() && isValidBrand(editingBrand)
                        ? `e.g., ${availableModels.slice(0, 3).join(', ')}`
                        : "Select brand first"}
                      placeholderTextColor={textSecondaryColor}
                      value={editingModel}
                      onChangeText={(text) => {
                        setEditingModel(text);
                        if (errors.model) {
                          setErrors({ ...errors, model: undefined });
                        }
                      }}
                      autoCapitalize="words"
                      editable={!saving && Boolean(editingBrand.trim() && isValidBrand(editingBrand))}
                    />
                    {errors.model ? <Text style={[styles.errorText, { color: errorColor }]}>{errors.model}</Text> : null}
                    {editingBrand.trim() && isValidBrand(editingBrand) && availableModels.length > 0 && (
                      <Text style={[styles.hintText, { color: textSecondaryColor }]}>
                        Available: {availableModels.slice(0, 5).join(', ')}
                        {availableModels.length > 5 ? ` +${availableModels.length - 5} more` : ''}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>Color *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.color ? { borderColor: errorColor } : null,
                      ]}
                      placeholder="e.g., Red, Blue, Black, White"
                      placeholderTextColor={textSecondaryColor}
                      value={editingColor}
                      onChangeText={(text) => {
                        setEditingColor(text);
                        if (errors.color) {
                          setErrors({ ...errors, color: undefined });
                        }
                      }}
                      autoCapitalize="words"
                      editable={!saving}
                    />
                    {errors.color ? <Text style={[styles.errorText, { color: errorColor }]}>{errors.color}</Text> : null}
                  </View>

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: inputBackground, borderWidth: 1, borderColor: inputBorder }]}
                      onPress={handleCancel}
                      disabled={saving}
                    >
                      <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: tintColor },
                        saving && styles.buttonDisabled,
                      ]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={[styles.value, { color: textColor }]}>
                  {(vehicleBrand && vehicleModel && vehicleColor)
                    ? `${vehicleBrand} ${vehicleModel} (${vehicleColor})`
                    : '-'}
                </Text>
              )}
            </View>
          </Card>
          
          <Button
            title="Log Out"
            onPress={handleLogout}
            variant="secondary"
            textStyle={{ color: errorColor, fontWeight: '700' }}
            style={[
              styles.logoutButton,
              { borderColor: errorColor + '88', backgroundColor: errorColor + '12' },
            ]}
          />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  premiumButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelPremiumButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  cancelPremiumButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumPriceText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  premiumNoteText: {
    marginTop: 4,
    fontSize: 11,
    opacity: 0.75,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionTitleCentered: {
    textAlign: 'center',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  benefitsList: {
    marginTop: 6,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  listText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});








