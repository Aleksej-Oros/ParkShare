/**
 * @deprecated UNUSED — not imported by any screen. Park Points UI not wired yet.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useThemeColor } from './Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface ParkPointsBarProps {
  points?: number;
  maxPoints?: number;
}

const ParkPointsBar: React.FC<ParkPointsBarProps> = ({ points = 20, maxPoints = 100 }) => {
  const percentage = Math.min((points / maxPoints) * 100, 100);
  const colorScheme = useColorScheme() ?? 'dark';
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const tintColor = Colors[colorScheme].tint;
  
  return (
    <View style={styles.wrapper}>
      <View style={[styles.barBg, { backgroundColor: inputBorder }]}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: tintColor }]} />
      </View>
      <Text style={[styles.text, { color: textSecondaryColor }]}>{points} / {maxPoints} ParkPoints</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
    marginBottom: 10,
  },
  barBg: {
    width: '100%',
    height: 18,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 18,
    borderRadius: 10,
  },
  text: {
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default ParkPointsBar;













