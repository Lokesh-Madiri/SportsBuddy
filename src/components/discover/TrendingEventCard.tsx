import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../common';
import { BorderRadius, Colors } from '../../theme';
import { formatDate } from '../../utils/helpers';
import type { TrendingEvent } from '../../services/search/searchService';
import { SPORTS } from '../../constants';

interface TrendingEventCardProps {
  item: TrendingEvent;
  rank: number;
  onPress: () => void;
}

export function TrendingEventCard({ item, rank, onPress }: TrendingEventCardProps) {
  const { event, trendScore, reason } = item;
  const sport = SPORTS.find((s) => s.name === event.sport);
  const fillPct = Math.round((event.currentPlayers / Math.max(1, event.maxPlayers)) * 100);
  const isHot = trendScore > 0.7;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.card} neonBorder={isHot}>
        {/* Rank badge */}
        <View style={[styles.rankBadge, rank <= 3 && styles.rankBadgeTop]}>
          <Text style={[styles.rankText, rank <= 3 && styles.rankTextTop]}>
            {rank === 1 ? '🔥' : rank === 2 ? '⚡' : rank === 3 ? '✨' : `#${rank}`}
          </Text>
        </View>

        <View style={styles.body}>
          {/* Sport icon */}
          <View style={styles.sportBadge}>
            <Text style={styles.sportIcon}>{sport?.icon ?? '🏅'}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
            <Text style={styles.sport}>{event.sport}  ·  {event.skillLevel}</Text>
            <Text style={styles.location} numberOfLines={1}>
              📍 {event.location.name}
            </Text>
            <Text style={styles.time}>
              🕐 {formatDate(event.date)}  {event.time}
            </Text>

            {/* Reason chip */}
            <View style={styles.reasonChip}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          </View>
        </View>

        {/* Players + fill */}
        <View style={styles.footer}>
          <Text style={styles.players}>
            👥 {event.currentPlayers}/{event.maxPlayers} players
          </Text>
          <View style={styles.fillTrack}>
            <View style={[styles.fillBar, { width: `${fillPct}%` as any }]} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    overflow: 'visible',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 1,
  },
  rankBadgeTop: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  rankText: { fontSize: 12, color: Colors.mutedForeground, fontWeight: '700' },
  rankTextTop: { color: Colors.primary },
  body: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  sportBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sportIcon: { fontSize: 24 },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.foreground },
  sport: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  location: { fontSize: 12, color: Colors.mutedForeground },
  time: { fontSize: 12, color: Colors.mutedForeground },
  reasonChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(190,255,0,0.08)',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  reasonText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  footer: { gap: 6 },
  players: { fontSize: 12, color: Colors.mutedForeground },
  fillTrack: {
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
