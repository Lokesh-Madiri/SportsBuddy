import React, { useEffect } from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '../../theme';

interface AnimatedBadgeProps {
  count?: number;
  label?: string;
  style?: ViewStyle;
}

export function AnimatedBadge({ count, label, style }: AnimatedBadgeProps) {
  const scale = useSharedValue(1);
  const text = label || (count && count > 9 ? '9+' : String(count || 0));

  useEffect(() => {
    if (count || label) {
      scale.value = withSequence(withSpring(1.16), withSpring(1));
    }
  }, [count, label, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!label && (!count || count <= 0)) return null;

  return (
    <Animated.View style={[styles.badge, animatedStyle, style]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 5,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primaryForeground,
  },
});
