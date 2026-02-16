import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { Button } from '@/components/Button';
import { login, clearError } from '@/features/auth/authSlice';
import { validateEmail, validatePassword } from '@/utils/validation';
import { sendPasswordReset } from '@/services/authService';
import { AppDispatch, RootState } from '@/store';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeColor } from '@/components/Themed';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { loading, errorMessage } = useSelector((state: RootState) => state.auth);
  
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    dispatch(clearError());

    // Trim email input
    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);

    // Validate inputs (required & format)
    if (!trimmedEmail) {
      setEmailError('Email is required.');
      return;
    }

    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email address.');
      return;
    }

    if (!password) {
      setPasswordError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    // Attempt login
    // CRITICAL: Only update auth state. AuthGuard will handle routing automatically.
    const result = await dispatch(login({ email: trimmedEmail, password }));

    if (login.fulfilled.match(result)) {
      // Login successful - AuthGuard will automatically redirect based on isOnboarded state
      // DO NOT navigate manually - let AuthGuard react to state change
    } else {
      const errorMsg = result.payload as string;
      if (errorMsg.includes('user-not-found')) {
        setEmailError('No user found with this email address.');
      } else if (errorMsg.includes('wrong-password')) {
        setPasswordError('Incorrect password. Please try again.');
      } else if (errorMsg.includes('invalid-email')) {
        setEmailError('Invalid email address.');
      } else {
        Alert.alert('Login Failed', errorMsg);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailValidation = validateEmail(forgotPasswordEmail);
    if (!emailValidation.isValid) {
      Alert.alert('Error', emailValidation.error || 'Invalid email address');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await sendPasswordReset(forgotPasswordEmail);
      Alert.alert(
        'Password Reset Sent',
        'Check your email for instructions to reset your password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send password reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoIconContainer, { backgroundColor: tintColor + '20' }]}>
              <Ionicons name="car" size={64} color={tintColor} />
            </View>
            <Text style={[styles.logoTitle, { color: tintColor }]}>ParkShare</Text>
          </View>
          <Text style={[styles.title, { color: textColor }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>Sign in to continue</Text>

          <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                emailError ? { borderColor: errorColor } : null,
              ]}
              placeholder="Email"
              placeholderTextColor={textSecondaryColor}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Live validation
                const { isValid, error } = validateEmail(text);
                setEmailError(isValid ? '' : error || '');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {emailError ? <Text style={[styles.errorText, { color: errorColor }]}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                  passwordError ? { borderColor: errorColor } : null,
                ]}
                placeholder="Password"
                placeholderTextColor={textSecondaryColor}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  // Live validation
                  const { isValid, error } = validatePassword(text);
                  setPasswordError(isValid ? '' : error || '');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={textSecondaryColor}
                />
              </Pressable>
            </View>
            {passwordError ? <Text style={[styles.errorText, { color: errorColor }]}>{passwordError}</Text> : null}
            <Link href="/auth/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPasswordButton}>
                <Text style={[styles.forgotPasswordText, { color: tintColor }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            variant="primary"
            loading={loading}
            disabled={loading || !!emailError || !!passwordError || !email || !password || password.length < 6}
            style={styles.button}
          />

          <View style={styles.linkContainer}>
            <Text style={[styles.linkText, { color: textSecondaryColor }]}>Don't have an account? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={[styles.link, { color: tintColor }]}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
          </View>
        </View>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Reset Password</Text>
            <Text style={[styles.modalSubtitle, { color: textSecondaryColor }]}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
              ]}
              placeholder="Email"
              placeholderTextColor={textSecondaryColor}
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!forgotPasswordLoading}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                }}
                variant="secondary"
                disabled={forgotPasswordLoading}
                style={styles.modalButton}
              />
              <Button
                title="Send"
                onPress={handleForgotPassword}
                variant="primary"
                loading={forgotPasswordLoading}
                disabled={forgotPasswordLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      )}
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
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconContainer: {
    marginBottom: 12,
    padding: 18,
    borderRadius: 60,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    marginTop: 10,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 15,
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});


