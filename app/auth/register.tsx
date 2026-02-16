/**
 * Register Screen
 * Uses react-hook-form with Zod validation
 * Firebase Auth ONLY
 * User profile is created later during onboarding
 */
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
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/Button';
import { register, clearError } from '@/features/auth/authSlice';
import { AppDispatch, RootState } from '@/store';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

// ------------------
// Validation schema
// ------------------
const RegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof RegisterSchema>;

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { loading, errorMessage } = useSelector((state: RootState) => state.auth);
  
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // ------------------
  // Submit handler
  // ------------------
  const onSubmit = async (data: RegisterFormData) => {
    dispatch(clearError());

    const trimmedEmail = data.email.trim();

    const result = await dispatch(
      register({
        email: trimmedEmail,
        password: data.password,
      })
    );

    if (register.fulfilled.match(result)) {
      // ✅ SUCCESS
      // Do NOTHING here.
      // AuthGuard will:
      // - detect authenticated user
      // - see that profile does not exist
      // - redirect to /onboarding
      return;
    }

    // ❌ ERROR HANDLING
    const errorMsg = result.payload as string;

    if (errorMsg?.includes('email-already-in-use')) {
      Alert.alert(
        'Registration Failed',
        'This email is already registered. Please sign in instead.'
      );
    } else if (errorMsg?.includes('weak-password')) {
      Alert.alert(
        'Registration Failed',
        'Password is too weak. Please choose a stronger password.'
      );
    } else {
      Alert.alert('Registration Failed', errorMsg || 'Unknown error occurred');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoIconContainer, { backgroundColor: tintColor + '20' }]}>
                <Ionicons name="car" size={64} color={tintColor} />
              </View>
              <Text style={[styles.logoTitle, { color: tintColor }]}>ParkShare</Text>
            </View>
            <Text style={[styles.title, { color: textColor }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>Join ParkShare today</Text>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputContainer}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                      errors.email ? { borderColor: errorColor } : null,
                    ]}
                    placeholder="Email"
                    placeholderTextColor={textSecondaryColor}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                )}
              />
              {errors.email && (
                <Text style={[styles.errorText, { color: errorColor }]}>{errors.email.message}</Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordContainer}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.password ? { borderColor: errorColor } : null,
                      ]}
                      placeholder="Password (min. 8 characters)"
                      placeholderTextColor={textSecondaryColor}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  )}
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
              {errors.password && (
                <Text style={[styles.errorText, { color: errorColor }]}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordContainer}>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                        errors.confirmPassword ? { borderColor: errorColor } : null,
                      ]}
                      placeholder="Confirm Password"
                      placeholderTextColor={textSecondaryColor}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  )}
                />
                <Pressable
                  style={styles.eyeIcon}
                  onPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  disabled={loading}
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={20}
                    color={textSecondaryColor}
                  />
                </Pressable>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorText, { color: errorColor }]}>
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Submit */}
            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              loading={loading}
              disabled={loading}
              style={styles.button}
            />

            <View style={styles.linkContainer}>
              <Text style={[styles.linkText, { color: textSecondaryColor }]}>Already have an account? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.link, { color: tintColor }]}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ------------------
// Styles
// ------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
});
