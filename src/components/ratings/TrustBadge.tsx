import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors } from '../../theme';
import type { ReputationLevel } from '../../utils/types';

type TrustBadgeProps = {
  level: ReputationLevel;
  trusted?: boolean;
};

const LABELS: Record<ReputationLevel, string> = {
  new: 'New player',
  rising: 'Rising trust',
  trusted: 'Trusted player',
  elite: 'Elite trust',
};

export function TrustBadge({ level, trusted }: TrustBadgeProps) {
  const isTrusted = trusted || level === 'trusted' || level === 'elite';

  return (
    <View style={[styles.badge, isTrusted && styles.trusted]}>
      <Ionicons
        name={isTrusted ? 'shield-checkmark' : 'shield-outline'}
        size={13}
        color={isTrusted ? Colors.primary : Colors.mutedForeground}
      />
      <Text style={[styles.text, isTrusted && styles.trustedText]}>{LABELS[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trusted: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mutedForeground,
  },
  trustedText: {
    color: Colors.primary,
  },
});
