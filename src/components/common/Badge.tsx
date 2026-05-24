import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'primary', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles] as any]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  primary: {
    backgroundColor: Colors.primaryDim,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  success: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  error: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryText: {
    color: Colors.primary,
  },
  secondaryText: {
    color: Colors.mutedForeground,
  },
  successText: {
    color: Colors.success,
  },
  errorText: {
    color: Colors.error,
  },
});
