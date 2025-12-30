/**
 * Onboarding Vehicle Information Screen
 * User enters their vehicle details
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { isValidBrand, isValidModelForBrand, getAllBrands, getModelsForBrand } from '@/utils/vehicleData';

export default function VehicleScreen() {
  const params = useLocalSearchParams<{ username: string }>();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<{ brand?: string; model?: string; color?: string }>({});
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const validate = () => {
    const newErrors: { brand?: string; model?: string; color?: string } = {};
    
    if (!brand.trim()) {
      newErrors.brand = 'Vehicle brand is required';
    } else if (!isValidBrand(brand)) {
      newErrors.brand = 'Please select a valid vehicle brand';
    }
    
    if (!model.trim()) {
      newErrors.model = 'Vehicle model is required';
    } else if (brand.trim() && !isValidModelForBrand(brand, model)) {
      newErrors.model = `"${model}" is not a valid model for ${brand}. Please select from available models.`;
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

    // Pass all data to confirm screen
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Vehicle Information</Text>
          <Text style={styles.subtitle}>
            Help others identify your vehicle when you share parking spots
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Brand *</Text>
            <TextInput
              style={[styles.input, errors.brand ? styles.inputError : null]}
              placeholder="e.g., Toyota, Honda, BMW"
              placeholderTextColor="#999"
              value={brand}
              onChangeText={(text) => {
                setBrand(text);
                // Update available models when brand changes
                if (text.trim() && isValidBrand(text)) {
                  setAvailableModels(getModelsForBrand(text));
                } else {
                  setAvailableModels([]);
                }
                // Clear model if brand changes
                if (model) {
                  setModel('');
                }
                if (errors.brand) {
                  setErrors({ ...errors, brand: undefined });
                }
              }}
              autoCapitalize="words"
              editable={Boolean(!loading)}
            />
            {errors.brand ? <Text style={styles.errorText}>{errors.brand}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Model *</Text>
            <TextInput
              style={[styles.input, errors.model ? styles.inputError : null]}
              placeholder={brand.trim() && isValidBrand(brand) 
                ? `e.g., ${availableModels.slice(0, 3).join(', ')}` 
                : "Select brand first"}
              placeholderTextColor="#999"
              value={model}
              onChangeText={(text) => {
                setModel(text);
                if (errors.model) {
                  setErrors({ ...errors, model: undefined });
                }
              }}
              autoCapitalize="words"
              editable={Boolean(!loading && brand.trim() && isValidBrand(brand))}
            />
            {errors.model ? <Text style={styles.errorText}>{errors.model}</Text> : null}
            {brand.trim() && isValidBrand(brand) && availableModels.length > 0 && (
              <Text style={styles.hintText}>
                Available models: {availableModels.slice(0, 5).join(', ')}
                {availableModels.length > 5 ? ` +${availableModels.length - 5} more` : ''}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Color *</Text>
            <TextInput
              style={[styles.input, errors.color ? styles.inputError : null]}
              placeholder="e.g., Red, Blue, Black, White"
              placeholderTextColor="#999"
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
            {errors.color ? <Text style={styles.errorText}>{errors.color}</Text> : null}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
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
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});



