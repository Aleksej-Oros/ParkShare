import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Themed';

interface ParkPointsBarProps {
  points?: number;
  maxPoints?: number;
}

const ParkPointsBar: React.FC<ParkPointsBarProps> = ({ points = 20, maxPoints = 100 }) => {
  const percentage = Math.min((points / maxPoints) * 100, 100);
  return (
    <View style={styles.wrapper}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.text}>{points} / {maxPoints} ParkPoints</Text>
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
    backgroundColor: '#e5e5e5',
    overflow: 'hidden',
  },
  barFill: {
    height: 18,
    borderRadius: 10,
    backgroundColor: '#2f95dc',
  },
  text: {
    fontSize: 13,
    marginTop: 5,
    color: '#333',
    textAlign: 'center',
  },
});

export default ParkPointsBar;













