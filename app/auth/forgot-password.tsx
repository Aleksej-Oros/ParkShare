import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Text, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/Button';
import { router } from 'expo-router';
import { validateEmail } from '@/utils/validation';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { sendPasswordReset } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  const handleReset = async () => {
    setEmailError('');
    const trimmedEmail = email.trim().toLowerCase();
    setEmail(trimmedEmail);
    if (!trimmedEmail) {
      setEmailError('Email is required.');
      return;
    }
    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      Alert.alert('Reset Email Requested', 'If an account exists for this email, a reset message will arrive shortly. Check spam/junk too.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') }
      ]);
    } catch (e: any) {
      const message = e?.message || 'Failed to send reset email.';
      if (message.toLowerCase().includes('invalid email')) {
        setEmailError('Invalid email address.');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: tintColor }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
              emailError && { borderColor: errorColor },
            ]}
            placeholder="Email"
            placeholderTextColor={textSecondaryColor}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {emailError ? <Text style={[styles.errorText, { color: errorColor }]}>{emailError}</Text> : null}
          <Button
            title="Send Reset Email"
            onPress={handleReset}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={styles.button}
          />
          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.backLink}>
            <Text style={[styles.link, { color: tintColor }]}>Back to Login</Text>
          </TouchableOpacity>
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
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 350,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 350,
  },
  button: {
    width: '100%',
    maxWidth: 350,
    marginTop: 10,
  },
  backLink: {
    marginTop: 24,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
});

