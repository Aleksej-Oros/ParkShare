import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Button } from '@/components/Button';
import { Text, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocale } from '@/context/LocaleContext';
import { auth } from '@/firebase';
import { validateConfirmPassword, validatePassword } from '@/utils/validation';
import Colors from '@/constants/Colors';

export default function ResetPasswordScreen() {
  const { t } = useLocale();
  const params = useLocalSearchParams<{ oobCode?: string | string[]; mode?: string | string[] }>();
  const resetCode = useMemo(
    () => (Array.isArray(params.oobCode) ? params.oobCode[0] : params.oobCode) || '',
    [params.oobCode]
  );
  const mode = useMemo(
    () => (Array.isArray(params.mode) ? params.mode[0] : params.mode) || '',
    [params.mode]
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  useEffect(() => {
    const checkResetLink = async () => {
      if (!resetCode || mode !== 'resetPassword') {
        setIsLinkValid(false);
        setCheckingLink(false);
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, resetCode);
        setResolvedEmail(email);
        setIsLinkValid(true);
      } catch {
        setIsLinkValid(false);
      } finally {
        setCheckingLink(false);
      }
    };

    checkResetLink();
  }, [mode, resetCode]);

  const handleResetPassword = async () => {
    setNewPasswordError('');
    setConfirmPasswordError('');

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setNewPasswordError(passwordValidation.error || t('auth.invalidEmail'));
      return;
    }

    const confirmValidation = validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      setConfirmPasswordError(confirmValidation.error || t('auth.invalidEmail'));
      return;
    }

    if (!resetCode) {
      Alert.alert(t('auth.invalidLink'), t('auth.invalidLinkMessageShort'));
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, resetCode, newPassword);
      setIsComplete(true);
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        Alert.alert(t('auth.expiredLink'), t('auth.expiredLinkMessage'));
      } else if (code === 'auth/weak-password') {
        setNewPasswordError(t('auth.passwordMinLength'));
      } else {
        Alert.alert(t('auth.error'), error?.message || t('auth.resetSendFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: textColor }]}>{t('auth.resetPasswordPageTitle')}</Text>

            {checkingLink ? (
              <Text style={[styles.subtitle, { color: textSecondaryColor }]}>{t('auth.checkingLink')}</Text>
            ) : !isLinkValid ? (
              <>
                <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                  {t('auth.invalidLinkMessage')}
                </Text>
                <Button title={t('auth.backToLogin')} onPress={handleGoToLogin} variant="primary" style={styles.button} />
              </>
            ) : isComplete ? (
              <>
                <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                  {t('auth.passwordUpdatedSuccess')}
                </Text>
                <Button title={t('auth.goToLogin')} onPress={handleGoToLogin} variant="primary" style={styles.button} />
              </>
            ) : (
              <>
                <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                  {resolvedEmail
                    ? `${t('auth.createNewPasswordFor')} ${resolvedEmail}.`
                    : t('auth.createNewPasswordForAccount')}
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                    newPasswordError ? { borderColor: errorColor } : null,
                  ]}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setNewPasswordError('');
                  }}
                  placeholder={t('auth.newPassword')}
                  placeholderTextColor={textSecondaryColor}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {newPasswordError ? <Text style={[styles.errorText, { color: errorColor }]}>{newPasswordError}</Text> : null}

                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                    confirmPasswordError ? { borderColor: errorColor } : null,
                  ]}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setConfirmPasswordError('');
                  }}
                  placeholder={t('profile.confirmNewPassword')}
                  placeholderTextColor={textSecondaryColor}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {confirmPasswordError ? (
                  <Text style={[styles.errorText, { color: errorColor }]}>{confirmPasswordError}</Text>
                ) : null}

                <Button
                  title={t('auth.updatePassword')}
                  onPress={handleResetPassword}
                  variant="primary"
                  loading={loading}
                  disabled={loading || !newPassword || !confirmPassword}
                  style={styles.button}
                />
              </>
            )}

            <Button title={t('auth.backToLogin')} onPress={handleGoToLogin} variant="secondary" style={styles.secondaryButton} />
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 24,
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 2,
  },
  button: {
    marginTop: 10,
  },
  secondaryButton: {
    marginTop: 10,
  },
});
