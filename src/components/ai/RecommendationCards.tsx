import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../common';
import { BorderRadius, Colors, Spacing } from '../../theme';
import type { EventRecommendation, TeammateRecommendation } from '../../services/aiService';

type Props = {
  events: EventRecommendation[];
  teammates: TeammateRecommendation[];
};

export function RecommendationCards({ events, teammates }: Props) {
  const items = [
    ...events.slice(0, 2).map((item) => ({
      id: `event-${item.event.id}`,
      label: item.event.sport,
      title: item.event.title,
      score: item.score,
      icon: 'calendar-outline' as const,
    })),
    ...teammates.slice(0, 2).map((item) => ({
      id: `user-${item.userId}`,
      label: item.sport,
      title: item.displayName,
      score: item.compatibilityScore,
      icon: 'people-outline' as const,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <GlassCard key={item.id} style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name={item.icon} size={16} color={Colors.primary} />
          </View>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.score}>{item.score}% match</Text>
        </GlassCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: 154,
    padding: 14,
    gap: 5,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.foreground,
  },
  score: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
});
