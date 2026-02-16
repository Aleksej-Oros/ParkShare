/**
 * Button Component
 * Reusable button component with dark mode support
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useThemeColor } from './Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const tintColor = Colors[colorScheme].tint;

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: tintColor };
      case 'secondary':
        return { backgroundColor: Colors[colorScheme].cardBackground, borderWidth: 1, borderColor: Colors[colorScheme].cardBorder };
      case 'danger':
        return { backgroundColor: Colors[colorScheme].error };
      case 'success':
        return { backgroundColor: Colors[colorScheme].success };
      default:
        return { backgroundColor: tintColor };
    }
  };

  const getTextStyle = () => {
    const isSecondary = variant === 'secondary';
    return {
      color: isSecondary ? Colors[colorScheme].text : '#fff',
    };
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? Colors[colorScheme].text : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
