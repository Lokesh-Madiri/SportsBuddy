import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, Badge } from '../common';
import { BorderRadius, Colors } from '../../theme';
import { formatDate } from '../../utils/helpers';
import type { SportEvent } from '../../utils/types';
import { SPORTS } from '../../constants';

interface EventDiscoveryCardProps {
  event: SportEvent & { distance?: string | { readable?: string } };
  onPress: () => void;
  onJoin?: () => void;
  showDistance?: boolean;
}

export function EventDiscoveryCard({ event, onPress, onJoin, showDistance = true }: EventDiscoveryCardProps) {
  const sport = SPORTS.find((s) => s.name === event.sport);
  const spotsLeft = event.maxPlayers - event.currentPlayers;
  const isFull = spotsLeft <= 0;
  const fillPct = Math.round((event.currentPlayers / Math.max(1, event.maxPlayers)) * 100);

  const distanceLabel = typeof event.distance === 'string'
    ? event.distance
    : (event.distance as any)?.readable ?? null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.card}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.sportBadge}>
            <Text style={styles.sportIcon}>{sport?.icon ?? '🏅'}</Text>
          </View>
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
              <Badge label={event.skillLevel} />
            </View>
            <Text style={styles.sportName}>{event.sport}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            📍 {event.location.name}
            {showDistance && distanceLabel ? `  ·  ${distanceLabel}` : ''}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            🕐 {formatDate(event.date)}  {event.time}
          </Text>
          <Text style={[styles.metaText, isFull && styles.fullText]}>
            👥 {event.currentPlayers}/{event.maxPlayers}
            {isFull ? '  FULL' : spotsLeft <= 3 ? `  (${spotsLeft} left)` : ''}
          </Text>
        </View>

        {/* Fill bar */}
        <View style={styles.fillTrack}>
          <View style={[styles.fillBar, { width: `${fillPct}%` as any, backgroundColor: isFull ? Colors.error : Colors.primary }]} />
        </View>

        {/* Join button */}
        {!isFull && onJoin && (
          <TouchableOpacity onPress={onJoin} style={styles.joinButton} activeOpacity={0.8}>
            <Text style={styles.joinText}>Join →</Text>
          </TouchableOpacity>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  sportBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    flexShrink: 0,
  },
  sportIcon: { fontSize: 22 },
  info: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    flex: 1,
  },
  sportName: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    flex: 1,
  },
  fullText: {
    color: Colors.error,
    fontWeight: '600',
  },
  fillTrack: {
    height: 3,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 2,
  },
  joinButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
