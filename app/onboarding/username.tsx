/**
 * Onboarding Username Screen
 * User selects their display name
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Text, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLocale } from '@/context/LocaleContext';

export default function UsernameScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  // Pre-fill with email username if available
  React.useEffect(() => {
    console.log('[UsernameScreen] Component mounted');
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      setUsername(emailUsername);
    }
  }, [user]);

  const validateUsername = (name: string): { isValid: boolean; error?: string } => {
    if (!name || !name.trim()) {
      return { isValid: false, error: t('onboarding.usernameRequired') };
    }
    if (name.trim().length < 3) {
      return { isValid: false, error: t('onboarding.usernameMinLength') };
    }
    if (name.trim().length > 30) {
      return { isValid: false, error: t('onboarding.usernameMaxLength') };
    }
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(name.trim())) {
      return { isValid: false, error: t('onboarding.usernameInvalidChars') };
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

    // Store username in route params for next onboarding step in stack.
    router.push({ pathname: '/onboarding/vehicle', params: { username: username.trim() } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: tintColor }]}>{t('onboarding.chooseUsernameTitle')}</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            {t('onboarding.chooseUsernameSubtitle')}
          </Text>

          <Card style={{ borderColor: tintColor + '55' }}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: textColor }]}>{t('onboarding.usernamePlaceholder')} *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                  error ? { borderColor: errorColor } : null,
                ]}
                placeholder={t('onboarding.usernamePlaceholder')}
                placeholderTextColor={textSecondaryColor}
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
              {error ? <Text style={[styles.errorText, { color: errorColor }]}>{error}</Text> : null}
            </View>
          </Card>

          <Button
            title={t('onboarding.next')}
            onPress={handleNext}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={styles.button}
          />
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
  },
});








