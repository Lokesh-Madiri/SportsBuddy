import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors } from '../../theme';
import { neonShadow } from '../../utils/platform';

interface NeonButtonProps {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function NeonButton({ title, icon, onPress, loading, disabled, style }: NeonButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primaryForeground} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={17} color={Colors.primaryForeground} />}
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...neonShadow(Colors.primary, 14, 0.42),
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primaryForeground,
  },
});
