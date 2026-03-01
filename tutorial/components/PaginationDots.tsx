/**
 * Pagination dots for tutorial carousel.
 * Memoized to avoid re-renders when only slide index changes.
 */
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

const DOT_SIZE = 8;
const DOT_MARGIN = 6;

type PaginationDotsProps = {
  count: number;
  activeIndex: number;
  activeColor: string;
  inactiveColor: string;
};

function PaginationDotsComponent({
  count,
  activeIndex,
  activeColor,
  inactiveColor,
}: PaginationDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === activeIndex ? activeColor : inactiveColor },
            i === activeIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

export const PaginationDots = memo(PaginationDotsComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_MARGIN,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    opacity: 0.4,
  },
  dotActive: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
});
