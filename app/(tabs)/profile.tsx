import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { View, StyleSheet, TouchableOpacity, Alert, SafeAreaView, TextInput, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { logout } from '@/features/auth/authSlice';
import { AppDispatch } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile.realtime';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { updateUser } from '@/services/userService';
import { updateUserPassword } from '@/services/authService';
import { isValidBrand, isValidModelForBrand, getModelsForBrand } from '@/utils/vehicleData';
import { validatePassword, validateConfirmPassword } from '@/utils/validation';
import {
  premiumMonthlyPrice,
  premiumCurrency,
  premiumBillingPeriod,
} from '@/config/premiumConfig';
import { SHARING_REWARD_TARGET } from '@/config/rewardsConfig';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeColor } from '@/components/Themed';
import { useLocale } from '@/context/LocaleContext';
import { SUPPORTED_LOCALES, getLocaleLabel } from '@/localization/languages';

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

  // Change password (Account tab)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangePasswordExpanded, setIsChangePasswordExpanded] = useState(false);
  
  const { locale, setLocale, t } = useLocale();
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
  const leavingSoonTarget = SHARING_REWARD_TARGET;
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
      newErrors.brand = t('profile.vehicleBrandRequired');
    } else if (!isValidBrand(editingBrand)) {
      newErrors.brand = t('profile.validVehicleBrand');
    }
    
    if (!editingModel.trim()) {
      newErrors.model = t('profile.vehicleModelRequired');
    } else if (editingBrand.trim() && !isValidModelForBrand(editingBrand, editingModel)) {
      newErrors.model = t('profile.validVehicleBrand');
    }
    
    if (!editingColor.trim()) {
      newErrors.color = t('profile.vehicleColorRequired');
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

  const handleChangePassword = async () => {
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    if (!currentPassword.trim()) {
      setCurrentPasswordError('Current password is required.');
      return;
    }

    const newValidation = validatePassword(newPassword);
    if (!newValidation.isValid) {
      setNewPasswordError(newValidation.error || 'Invalid password');
      return;
    }

    const confirmValidation = validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      setConfirmPasswordError(confirmValidation.error || 'Passwords do not match');
      return;
    }

    if (!authUser) {
      Alert.alert('Error', 'You must be logged in to change your password.');
      return;
    }

    setChangePasswordLoading(true);
    try {
      await updateUserPassword(authUser, currentPassword.trim(), newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been updated. Use your new password next time you sign in.');
    } catch (error: any) {
      const msg = error?.message ?? 'Failed to update password.';
      if (msg.toLowerCase().includes('current password') || msg.toLowerCase().includes('incorrect')) {
        setCurrentPasswordError('Current password is incorrect.');
      } else if (msg.toLowerCase().includes('weak')) {
        setNewPasswordError('Password must be at least 6 characters.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setChangePasswordLoading(false);
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
          <Text style={[styles.title, { color: tintColor }]}>{t('profile.title')}</Text>

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
                {t('profile.overview')}
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
                {t('profile.account')}
              </Text>
            </TouchableOpacity>
          </View>

          {activeSection === 'overview' && (
            <>
          <Card variant="premium" style={{ borderColor: tintColor + '55' }}>
            {premiumLoading ? (
              <>
                <Text style={[styles.cardTitle, { color: textColor }]}>{t('profile.premiumStatus')}</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>{t('profile.checkingStatus')}</Text>
              </>
            ) : isPremium ? (
              <>
                <Text style={[styles.cardTitle, { color: textColor }]}>{t('profile.premiumDriver')}</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>{t('profile.premiumActive')}</Text>
                <TouchableOpacity
                  style={[styles.cancelPremiumButton, { backgroundColor: cardBackground, borderColor: inputBorder }]}
                  onPress={handleCancelPremium}
                >
                  <Text style={[styles.cancelPremiumButtonText, { color: textColor }]}>{t('profile.cancelPremium')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.cardTitle, { color: textColor }]}>{t('profile.upgradeToPremium')}</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondaryColor }]}>
                  {t('profile.reserveSpotsNavigateEarn')}
                </Text>
                <TouchableOpacity
                  style={[styles.premiumButton, { backgroundColor: tintColor }]}
                  onPress={() => router.push('/modal')}
                >
                  <Text style={styles.premiumButtonText}>{t('profile.goPremium')}</Text>
                </TouchableOpacity>
                <Text style={[styles.premiumPriceText, { color: textSecondaryColor }]}>
                  {premiumMonthlyPrice} {premiumCurrency} / {premiumBillingPeriod}
                </Text>
                <Text style={[styles.premiumNoteText, { color: textSecondaryColor }]}>{t('profile.cancelAnytime')}</Text>
              </>
            )}
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setIsBenefitsExpanded((prev) => !prev)}
            >
              <Text style={[styles.sectionTitle, { color: textColor }]}>{t('profile.whatYouGetWithPremium')}</Text>
              <Text style={[styles.collapsibleIcon, { color: tintColor }]}>
                {isBenefitsExpanded ? '-' : '+'}
              </Text>
            </TouchableOpacity>
            {isBenefitsExpanded ? (
              <View style={styles.benefitsList}>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('profile.benefitReserve')}</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('profile.benefitNavigate')}</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('profile.benefitInstantPin')}</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('profile.benefitPriority')}</Text>
                </View>
                <View style={styles.listItemRow}>
                  <View style={[styles.listDot, { backgroundColor: tintColor }]} />
                  <Text style={[styles.listText, { color: textSecondaryColor }]}>{t('profile.benefitRewards')}</Text>
                </View>
              </View>
            ) : null}
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{t('profile.yourActivityThisMonth')}</Text>
            <View style={[styles.progressBarTrack, { backgroundColor: inputBorder }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${leavingSoonProgressPercent}%`, backgroundColor: tintColor },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: textSecondaryColor }]}>
              {leavingSoonSharedThisMonth} / {leavingSoonTarget} {t('profile.leavingSoonSpotsShared')}
            </Text>
            {hasRewardUnlocked ? (
              <Text style={[styles.rewardText, { color: successColor }]}>{t('profile.earnedDiscount')}</Text>
            ) : null}
            {!isPremium && (
              <Text style={[styles.noteText, { color: textSecondaryColor }]}>
                {t('profile.premiumUnlockNote')}
              </Text>
            )}
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{t('profile.preferences')}</Text>
            <Text style={[styles.languageDescription, { color: textSecondaryColor }]}>{t('profile.languageDescription')}</Text>
            {SUPPORTED_LOCALES.map(({ code }) => (
              <TouchableOpacity
                key={code}
                style={[styles.languageRow, locale === code && { backgroundColor: tintColor + '18' }]}
                onPress={() => setLocale(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.languageRowLabel, { color: textColor }]}>
                  {getLocaleLabel(code, locale)}
                </Text>
                {locale === code ? (
                  <Ionicons name="checkmark-circle" size={24} color={tintColor} />
                ) : (
                  <View style={[styles.languageRowDot, { borderColor: inputBorder }]} />
                )}
              </TouchableOpacity>
            ))}
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{t('profile.support')}</Text>
            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => router.push('/tutorial-modal?forceOpen=true')}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle-outline" size={24} color={tintColor} style={styles.supportIcon} />
              <View style={styles.supportTextWrap}>
                <Text style={[styles.supportItemTitle, { color: textColor }]}>{t('profile.appTutorial')}</Text>
                <Text style={[styles.supportItemSubtitle, { color: textSecondaryColor }]}>{t('profile.appTutorialSubtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSecondaryColor} />
            </TouchableOpacity>
          </Card>
            </>
          )}
          
          {activeSection === 'account' && (
            <>
          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered, { color: tintColor }]}>{t('profile.user')}</Text>
            <View style={styles.section}>
              <Text style={[styles.label, { color: textSecondaryColor }]}>{t('profile.name')}</Text>
              <Text style={[styles.value, { color: textColor }]}>{displayName}</Text>
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { color: textSecondaryColor }]}>{t('profile.email')}</Text>
              <Text style={[styles.value, { color: textColor }]}>{email}</Text>
            </View>
          </Card>

          <Card style={{ borderColor: tintColor + '55' }}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered, { color: tintColor }]}>{t('profile.vehicle')}</Text>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.label, { color: textSecondaryColor }]}>{t('profile.details')}</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                    <Text style={[styles.editButtonText, { color: tintColor }]}>{t('profile.edit')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isEditing ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>{t('profile.brand')}</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.brand ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={t('profile.placeholderBrand')}
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
                    <Text style={[styles.inputLabel, { color: textColor }]}>{t('profile.model')}</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.model ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={editingBrand.trim() && isValidBrand(editingBrand)
                        ? `${availableModels.slice(0, 3).join(', ')}`
                        : t('profile.selectBrandFirst')}
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
                        {t('profile.available')} {availableModels.slice(0, 5).join(', ')}
                        {availableModels.length > 5 ? ` +${availableModels.length - 5} ${t('profile.more')}` : ''}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>{t('profile.color')}</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.color ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={t('profile.placeholderColor')}
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
                      <Text style={[styles.cancelButtonText, { color: textColor }]}>{t('common.cancel')}</Text>
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
                        <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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

          {(() => {
            const hasPasswordProvider = authUser?.providerData?.some((p) => p?.providerId === 'password') ?? false;
            if (!hasPasswordProvider) return null;
            return (
              <Card style={{ borderColor: tintColor + '55', marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.collapsibleHeader, styles.collapsibleHeaderCentered]}
                  onPress={() => setIsChangePasswordExpanded((prev) => !prev)}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsibleHeaderSpacer} />
                  <Text style={[styles.sectionTitle, styles.sectionTitleCentered, { color: tintColor, flex: 1 }]}>{t('profile.changePassword')}</Text>
                  <View style={styles.collapsibleHeaderChevronWrap}>
                    <Ionicons
                      name={isChangePasswordExpanded ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color={tintColor}
                    />
                  </View>
                </TouchableOpacity>
                {isChangePasswordExpanded ? (
                <>
                <View style={styles.section}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>{t('profile.currentPassword')}</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        currentPasswordError ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={t('profile.enterCurrentPassword')}
                      placeholderTextColor={textSecondaryColor}
                      value={currentPassword}
                      onChangeText={(t) => { setCurrentPassword(t); setCurrentPasswordError(''); }}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!changePasswordLoading}
                    />
                    <Pressable style={styles.eyeIcon} onPress={() => setShowCurrentPassword((v) => !v)}>
                      <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondaryColor} />
                    </Pressable>
                  </View>
                  {currentPasswordError ? <Text style={[styles.errorText, { color: errorColor }]}>{currentPasswordError}</Text> : null}
                </View>
                <View style={styles.section}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>{t('profile.newPassword')}</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        newPasswordError ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={t('profile.atLeast6Chars')}
                      placeholderTextColor={textSecondaryColor}
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); setNewPasswordError(''); }}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!changePasswordLoading}
                    />
                    <Pressable style={styles.eyeIcon} onPress={() => setShowNewPassword((v) => !v)}>
                      <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondaryColor} />
                    </Pressable>
                  </View>
                  {newPasswordError ? <Text style={[styles.errorText, { color: errorColor }]}>{newPasswordError}</Text> : null}
                </View>
                <View style={styles.section}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>{t('profile.confirmPassword')}</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        confirmPasswordError ? { borderColor: errorColor } : null,
                      ]}
                      placeholder={t('profile.confirmNewPassword')}
                      placeholderTextColor={textSecondaryColor}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setConfirmPasswordError(''); }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!changePasswordLoading}
                    />
                    <Pressable style={styles.eyeIcon} onPress={() => setShowConfirmPassword((v) => !v)}>
                      <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondaryColor} />
                    </Pressable>
                  </View>
                  {confirmPasswordError ? <Text style={[styles.errorText, { color: errorColor }]}>{confirmPasswordError}</Text> : null}
                </View>
                <Button
                  title={t('profile.changePasswordButton')}
                  onPress={handleChangePassword}
                  variant="primary"
                  loading={changePasswordLoading}
                  disabled={changePasswordLoading || !currentPassword || !newPassword || !confirmPassword}
                  style={styles.changePasswordButton}
                />
                </>
                ) : null}
              </Card>
            );
          })()}
          
          <Button
            title={t('profile.logOut')}
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
  collapsibleChevron: {
    marginLeft: 8,
  },
  collapsibleHeaderCentered: {
    justifyContent: 'center',
  },
  collapsibleHeaderSpacer: {
    width: 30,
  },
  collapsibleHeaderChevronWrap: {
    width: 30,
    alignItems: 'flex-end',
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
  changePasswordButton: {
    marginTop: 8,
  },
  passwordInputRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
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
  languageDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  languageRowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageRowDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  supportIcon: {
    marginRight: 12,
  },
  supportTextWrap: {
    flex: 1,
  },
  supportItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  supportItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});








