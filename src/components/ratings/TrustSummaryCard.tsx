import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common';
import { BorderRadius, Colors, Spacing } from '../../theme';
import type { ReputationMetrics } from '../../utils/types';
import { TrustBadge } from './TrustBadge';

type TrustSummaryCardProps = {
  metrics: ReputationMetrics;
};

export function TrustSummaryCard({ metrics }: TrustSummaryCardProps) {
  const items = [
    { label: 'Sportsmanship', value: metrics.sportsmanshipScore, icon: 'people-outline' },
    { label: 'Reliability', value: metrics.reliabilityScore, icon: 'time-outline' },
    { label: 'Community', value: metrics.communityScore, icon: 'pulse-outline' },
  ] as const;

  return (
    <GlassCard style={styles.card} neonBorder={metrics.trustedBadge}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Trust score</Text>
          <Text style={styles.score}>{metrics.communityScore}%</Text>
        </View>
        <TrustBadge level={metrics.trustLevel} trusted={metrics.trustedBadge} />
      </View>

      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.metric}>
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={16} color={Colors.primary} />
            </View>
            <Text style={styles.metricValue}>{item.value}%</Text>
            <Text style={styles.metricLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Attendance {metrics.attendanceRate}%</Text>
        <Text style={styles.footerDivider}>/</Text>
        <Text style={styles.footerText}>Cancellations {metrics.cancellationRate}%</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  score: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: '800',
    color: Colors.foreground,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.foreground,
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  footerDivider: {
    color: Colors.border,
  },
});
