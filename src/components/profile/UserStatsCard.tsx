import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common';
import { BorderRadius, Colors, Spacing } from '../../theme';
import type { ReputationMetrics, User } from '../../utils/types';

type Props = {
  user: User | null;
  metrics?: ReputationMetrics | null;
};

export function UserStatsCard({ user, metrics }: Props) {
  const stats = [
    {
      label: 'Matches',
      value: String(user?.stats?.gamesPlayed || user?.totalMatches || 0),
      icon: 'football-outline',
    },
    {
      label: 'Rating',
      value: `${(metrics?.averageRating || user?.rating || user?.averageRating || 0).toFixed(1)}`,
      icon: 'star-outline',
    },
    {
      label: 'Reliable',
      value: `${metrics?.reliabilityScore || user?.reliabilityScore || 100}%`,
      icon: 'time-outline',
    },
  ] as const;

  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <GlassCard key={stat.label} style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name={stat.icon} size={18} color={Colors.primary} />
          </View>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    padding: Spacing.base,
    alignItems: 'center',
    gap: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.foreground,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mutedForeground,
  },
});
