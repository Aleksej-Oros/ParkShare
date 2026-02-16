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
import { auth } from '@/firebase';
import { validateConfirmPassword, validatePassword } from '@/utils/validation';
import Colors from '@/constants/Colors';

export default function ResetPasswordScreen() {
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
      setNewPasswordError(passwordValidation.error || 'Invalid password');
      return;
    }

    const confirmValidation = validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      setConfirmPasswordError(confirmValidation.error || 'Passwords do not match');
      return;
    }

    if (!resetCode) {
      Alert.alert('Invalid Link', 'Password reset link is missing required information.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, resetCode, newPassword);
      setIsComplete(true);
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        Alert.alert('Expired Link', 'This password reset link is invalid or expired. Please request a new one.');
      } else if (code === 'auth/weak-password') {
        setNewPasswordError('Password must be at least 6 characters.');
      } else {
        Alert.alert('Error', error?.message || 'Could not reset password. Please try again.');
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
            <Text style={[styles.title, { color: textColor }]}>Reset your password</Text>

            {checkingLink ? (
              <Text style={[styles.subtitle, { color: textSecondaryColor }]}>Checking your reset link...</Text>
            ) : !isLinkValid ? (
              <>
                <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                  This reset link is invalid or expired. Request a new one from the Forgot Password page.
                </Text>
                <Button title="Back to Login" onPress={handleGoToLogin} variant="primary" style={styles.button} />
              </>
            ) : isComplete ? (
              <>
                <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                  Your password was updated successfully. You can now sign in with your new password.
                </Text>
                <Button title="Go to Login" onPress={handleGoToLogin} variant="primary" style={styles.button} />
              </>
            ) : (
              <>
                <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                  {resolvedEmail
                    ? `Create a new password for ${resolvedEmail}.`
                    : 'Create a new password for your account.'}
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
                  placeholder="New password"
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
                  placeholder="Confirm new password"
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
                  title="Update Password"
                  onPress={handleResetPassword}
                  variant="primary"
                  loading={loading}
                  disabled={loading || !newPassword || !confirmPassword}
                  style={styles.button}
                />
              </>
            )}

            <Button title="Back to Login" onPress={handleGoToLogin} variant="secondary" style={styles.secondaryButton} />
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
