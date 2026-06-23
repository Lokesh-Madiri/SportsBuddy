import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { neonShadow } from '../../utils/platform';

interface FloatingActionButtonProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  style?: ViewStyle;
}

export function FloatingActionButton({ icon = 'add', onPress, style }: FloatingActionButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[styles.fab, style]}>
      <Ionicons name={icon} size={26} color={Colors.primaryForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...neonShadow(Colors.primary, 16, 0.48),
  },
});
