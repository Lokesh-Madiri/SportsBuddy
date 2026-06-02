import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { GlassCard } from '../common';
import { Colors } from '../../theme';

export function TypingIndicator() {
  const dots = useMemo(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ], []);

  useEffect(() => {
    dots.forEach((dot, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(dot, { toValue: -6, duration: 260, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 260, useNativeDriver: true }),
        ])
      ).start();
    });
  }, [dots]);

  return (
    <GlassCard style={styles.container}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[styles.dot, { transform: [{ translateY: dot }] }]}
        />
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 5,
    borderBottomLeftRadius: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
