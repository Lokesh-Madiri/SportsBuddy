import React, { useEffect, useMemo } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
  style?: ViewStyle;
};

export function StarRating({
  value,
  onChange,
  size = 24,
  readonly = false,
  style,
}: StarRatingProps) {
  const scale = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.12, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [scale, value]);

  return (
    <Animated.View style={[styles.row, { transform: [{ scale }] }, style]}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Math.round(value);
        return (
          <Pressable
            key={star}
            hitSlop={8}
            disabled={readonly}
            onPress={() => onChange?.(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={active ? 'star' : 'star-outline'}
              size={size}
              color={active ? Colors.primary : Colors.mutedForeground}
            />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
