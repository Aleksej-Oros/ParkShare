/**
 * Onboarding Username Screen
 * User selects their display name
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Text } from '@/components/Themed';
import { validateEmail } from '@/utils/validation';

export default function UsernameScreen() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill with email username if available
  React.useEffect(() => {
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      setUsername(emailUsername);
    }
  }, [user]);

  const validateUsername = (name: string): { isValid: boolean; error?: string } => {
    if (!name || !name.trim()) {
      return { isValid: false, error: 'Username is required' };
    }
    if (name.trim().length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    if (name.trim().length > 30) {
      return { isValid: false, error: 'Username must be less than 30 characters' };
    }
    // Basic validation - no special characters except underscore and dash
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(name.trim())) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscore, and dash' };
    }
    return { isValid: true };
  };

  const handleNext = () => {
    setError('');
    const validation = validateUsername(username);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid username');
      return;
    }

    // Store username in route params for next screen
    router.push({
      pathname: '/onboarding/vehicle',
      params: { username: username.trim() },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Username</Text>
        <Text style={styles.subtitle}>
          This is how other users will see you in the app
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Enter username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            editable={!loading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Next</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2f95dc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    height: 50,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});








