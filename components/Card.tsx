/**
 * Card Component
 * Reusable card component with dark mode support
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColor } from './Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'premium' | 'elevated';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const colorScheme = useColorScheme() ?? 'dark';
  const tintColor = Colors[colorScheme].tint;
  const borderColor = tintColor + '55';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor },
        variant === 'premium' && styles.premiumCard,
        variant === 'elevated' && styles.elevatedCard,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  premiumCard: {
    borderWidth: 1.5,
  },
  elevatedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
