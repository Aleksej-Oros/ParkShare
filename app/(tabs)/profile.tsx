import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { View, StyleSheet, TouchableOpacity, Alert, SafeAreaView, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
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
  const hasSetBenefitsDefault = useRef(false);
  
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Profile</Text>

          <View style={[styles.card, styles.premiumCard]}>
            {premiumLoading ? (
              <>
                <Text style={styles.cardTitle}>Premium Status</Text>
                <Text style={styles.cardSubtitle}>Checking your status...</Text>
              </>
            ) : isPremium ? (
              <>
                <Text style={styles.cardTitle}>Premium Driver ⭐</Text>
                <Text style={styles.cardSubtitle}>Premium active</Text>
                <TouchableOpacity
                  style={styles.cancelPremiumButton}
                  onPress={handleCancelPremium}
                >
                  <Text style={styles.cancelPremiumButtonText}>Cancel Premium</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Upgrade to Premium</Text>
                <Text style={styles.cardSubtitle}>
                  Reserve spots, navigate faster, earn rewards
                </Text>
                <TouchableOpacity
                  style={styles.premiumButton}
                  onPress={() => router.push('/modal')}
                >
                  <Text style={styles.premiumButtonText}>Go Premium</Text>
                </TouchableOpacity>
                <Text style={styles.premiumPriceText}>
                  {premiumMonthlyPrice} {premiumCurrency} / {premiumBillingPeriod}
                </Text>
                <Text style={styles.premiumNoteText}>Cancel anytime</Text>
              </>
            )}
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setIsBenefitsExpanded((prev) => !prev)}
            >
              <Text style={styles.sectionTitle}>What you get with Premium</Text>
              <Text style={styles.collapsibleIcon}>
                {isBenefitsExpanded ? '-' : '+'}
              </Text>
            </TouchableOpacity>
            {isBenefitsExpanded ? (
              <View style={styles.benefitsList}>
                <View style={styles.listItemRow}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>Reserve parking spots before they free up</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>In-app route navigation to pins</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>Instant pin visibility (no delay)</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>Priority access to shared spots</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>Monthly rewards & discounts</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Activity This Month</Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${leavingSoonProgressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {leavingSoonSharedThisMonth} / {leavingSoonTarget} Leaving Soon spots shared
            </Text>
            {hasRewardUnlocked ? (
              <Text style={styles.rewardText}>🎉 You earned 50% off next month!</Text>
            ) : null}
            {!isPremium && (
              <Text style={styles.noteText}>
                Premium users can unlock discounts through sharing.
              </Text>
            )}
          </View>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>User</Text>
            <View style={styles.section}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{displayName}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{email}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Details</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isEditing ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Brand *</Text>
                    <TextInput
                      style={[styles.input, errors.brand ? styles.inputError : null]}
                      placeholder="e.g., Toyota, Honda, BMW"
                      placeholderTextColor="#999"
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
                    {errors.brand ? <Text style={styles.errorText}>{errors.brand}</Text> : null}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Model *</Text>
                    <TextInput
                      style={[styles.input, errors.model ? styles.inputError : null]}
                      placeholder={editingBrand.trim() && isValidBrand(editingBrand)
                        ? `e.g., ${availableModels.slice(0, 3).join(', ')}`
                        : "Select brand first"}
                      placeholderTextColor="#999"
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
                    {errors.model ? <Text style={styles.errorText}>{errors.model}</Text> : null}
                    {editingBrand.trim() && isValidBrand(editingBrand) && availableModels.length > 0 && (
                      <Text style={styles.hintText}>
                        Available: {availableModels.slice(0, 5).join(', ')}
                        {availableModels.length > 5 ? ` +${availableModels.length - 5} more` : ''}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Color *</Text>
                    <TextInput
                      style={[styles.input, errors.color ? styles.inputError : null]}
                      placeholder="e.g., Red, Blue, Black, White"
                      placeholderTextColor="#999"
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
                    {errors.color ? <Text style={styles.errorText}>{errors.color}</Text> : null}
                  </View>

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={handleCancel}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.saveButton, saving && styles.buttonDisabled]}
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
                <Text style={styles.value}>
                  {(vehicleBrand && vehicleModel && vehicleColor)
                    ? `${vehicleBrand} ${vehicleModel} (${vehicleColor})`
                    : '-'}
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#1d4e89',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f8f9fb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e8f0',
  },
  premiumCard: {
    backgroundColor: '#f8fbff',
    borderColor: '#dbeafe',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4e89',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 12,
  },
  premiumButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2f95dc',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d7e2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  cancelPremiumButtonText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumPriceText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  premiumNoteText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
    opacity: 0.75,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#e3e8f0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2f95dc',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 14,
    color: '#2a7b3f',
    fontWeight: '600',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#6b7280',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleIcon: {
    fontSize: 18,
    color: '#2f95dc',
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
    backgroundColor: '#2f95dc',
    marginTop: 8,
    marginRight: 10,
  },
  listText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#2f95dc',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    color: '#666',
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
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2f95dc',
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








