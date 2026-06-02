import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common';
import { BorderRadius, Colors, Spacing } from '../../theme';
import type { MatchHistoryItem } from '../../utils/types';
import { formatDate } from '../../utils/helpers';

type Props = {
  matches: MatchHistoryItem[];
};

export function MatchHistoryList({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <GlassCard style={styles.emptyCard}>
        <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
        <View style={styles.emptyText}>
          <Text style={styles.emptyTitle}>No completed matches yet</Text>
          <Text style={styles.emptySubtitle}>Joined and completed events will show up here.</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={styles.list}>
      {matches.map((match) => (
        <GlassCard key={match.id} style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={styles.sportInitial}>{match.sport.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{match.title}</Text>
            <Text style={styles.meta}>{match.sport} / {formatDate(match.date)}</Text>
          </View>
          <View style={styles.resultBox}>
            <Text style={styles.result}>{match.result || 'Played'}</Text>
            {!!match.score && <Text style={styles.score}>{match.score}</Text>}
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportInitial: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.primary,
  },
  info: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.foreground,
  },
  meta: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  resultBox: { alignItems: 'flex-end' },
  result: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.success,
  },
  score: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.base,
  },
  emptyText: { flex: 1 },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.foreground,
  },
  emptySubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
});
