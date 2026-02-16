/**
 * Onboarding Vehicle Information Screen
 * User enters their vehicle details
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function VehicleScreen() {
  const params = useLocalSearchParams<{ username: string }>();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<{ brand?: string; model?: string; color?: string }>({});
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  const errorColor = Colors[colorScheme].error;

  const validate = () => {
    const newErrors: { brand?: string; model?: string; color?: string } = {};
    
    if (!brand.trim()) {
      newErrors.brand = 'Vehicle brand is required';
    }
    
    if (!model.trim()) {
      newErrors.model = 'Vehicle model is required';
    }
    
    if (!color.trim()) {
      newErrors.color = 'Vehicle color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) {
      return;
    }

    // Pass all data to confirm onboarding screen in stack
    router.push({
      pathname: '/onboarding/confirm',
      params: {
        username: params.username || '',
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: tintColor }]}>Vehicle Information</Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
              Help others identify your vehicle when you share parking spots
            </Text>

            <Card style={{ borderColor: tintColor + '55' }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: textColor }]}>Brand *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                    errors.brand ? { borderColor: errorColor } : null,
                  ]}
                  placeholder="e.g., Toyota, Honda, BMW"
                  placeholderTextColor={textSecondaryColor}
                  value={brand}
                  onChangeText={(text) => {
                    setBrand(text);
                    if (errors.brand) {
                      setErrors({ ...errors, brand: undefined });
                    }
                  }}
                  autoCapitalize="words"
                  editable={Boolean(!loading)}
                />
                {errors.brand ? <Text style={[styles.errorText, { color: errorColor }]}>{errors.brand}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: textColor }]}>Model *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                    errors.model ? { borderColor: errorColor } : null,
                  ]}
                  placeholder="e.g., Civic, Model 3, F-150"
                  placeholderTextColor={textSecondaryColor}
                  value={model}
                  onChangeText={(text) => {
                    setModel(text);
                    if (errors.model) {
                      setErrors({ ...errors, model: undefined });
                    }
                  }}
                  autoCapitalize="words"
                  editable={Boolean(!loading)}
                />
                {errors.model ? <Text style={[styles.errorText, { color: errorColor }]}>{errors.model}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: textColor }]}>Color *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBackground, borderColor: inputBorder, color: textColor },
                    errors.color ? { borderColor: errorColor } : null,
                  ]}
                  placeholder="e.g., Red, Blue, Black, White"
                  placeholderTextColor={textSecondaryColor}
                  value={color}
                  onChangeText={(text) => {
                    setColor(text);
                    if (errors.color) {
                      setErrors({ ...errors, color: undefined });
                    }
                  }}
                  autoCapitalize="words"
                  editable={Boolean(!loading)}
                />
                {errors.color ? <Text style={[styles.errorText, { color: errorColor }]}>{errors.color}</Text> : null}
              </View>
            </Card>

            <Button
              title="Next"
              onPress={handleNext}
              variant="primary"
              loading={loading}
              disabled={loading}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 32,
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 16,
  },
  label: {
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
    marginTop: 4,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});



