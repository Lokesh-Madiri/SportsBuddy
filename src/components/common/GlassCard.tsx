import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  neonBorder?: boolean;
}

export function GlassCard({ children, style, neonBorder = false }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        neonBorder && styles.neonBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  neonBorder: {
    borderColor: Colors.primaryBorder,
  },
});
