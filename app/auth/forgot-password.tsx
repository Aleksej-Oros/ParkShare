import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';
import { validateEmail } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setEmailError('');
    const trimmedEmail = email.trim();
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
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert('Reset Email Sent', 'Check your email for instructions to reset your password.', [
        { text: 'OK', onPress: () => router.replace('/auth/login') }
      ]);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        setEmailError('No user found with this email address.');
      } else if (e.code === 'auth/invalid-email') {
        setEmailError('Invalid email address.');
      } else {
        Alert.alert('Error', e.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a link to reset your password.</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="Email"
          placeholderTextColor="#999"
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
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Email</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.backLink}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: '#2f95dc', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 28, textAlign: 'center' },
  input: { width: '100%', maxWidth: 350, height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, marginBottom: 10, backgroundColor: '#f9f9f9' },
  inputError: { borderColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 12, marginBottom: 8, marginLeft: 4, alignSelf: 'flex-start', width: '100%', maxWidth: 350 },
  button: { height: 50, backgroundColor: '#2f95dc', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, width: '100%', maxWidth: 350 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: 24 },
  link: { color: '#2f95dc', fontSize: 15, fontWeight: '600' },
});

