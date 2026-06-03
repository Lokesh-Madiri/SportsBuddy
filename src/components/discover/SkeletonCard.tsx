import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BorderRadius, Colors } from '../../theme';
import { nativeDriver } from '../../utils/platform';

function SkeletonPulse({ style }: { style?: object }) {
  // Lazy-init Animated.Value so it's stable across renders without using a ref
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: nativeDriver }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: nativeDriver }),
      ])
    ).start();
    // opacity is stable (lazy-init state) — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={[styles.base, { opacity }, style]} />;
}

export function EventSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <SkeletonPulse style={styles.icon} />
        <View style={styles.infoCol}>
          <SkeletonPulse style={styles.lineWide} />
          <SkeletonPulse style={styles.lineShort} />
        </View>
      </View>
      <SkeletonPulse style={styles.lineMed} />
      <SkeletonPulse style={styles.lineShort} />
      <SkeletonPulse style={styles.fillBar} />
    </View>
  );
}

export function PlayerSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <SkeletonPulse style={styles.avatar} />
        <View style={styles.infoCol}>
          <SkeletonPulse style={styles.lineWide} />
          <SkeletonPulse style={styles.lineShort} />
          <SkeletonPulse style={styles.lineMed} />
        </View>
        <SkeletonPulse style={styles.compatBox} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  card: {
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 16,
    gap: 10,
  },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 44, height: 44, borderRadius: BorderRadius.md, flexShrink: 0 },
  avatar: { width: 52, height: 52, borderRadius: 26, flexShrink: 0 },
  infoCol: { flex: 1, gap: 8, paddingTop: 4 },
  lineWide: { height: 14, borderRadius: 4, width: '80%' },
  lineMed: { height: 11, borderRadius: 4, width: '60%' },
  lineShort: { height: 11, borderRadius: 4, width: '40%' },
  fillBar: { height: 3, borderRadius: 2 },
  compatBox: { width: 44, height: 44, borderRadius: BorderRadius.md, flexShrink: 0 },
});
