import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, Avatar, Badge } from '../common';
import { BorderRadius, Colors } from '../../theme';
import type { NearbyUser } from '../../services/location/locationTypes';

interface NearbyPlayerCardProps {
  player: NearbyUser;
  compatibilityScore?: number;
  onPress: () => void;
}

export function NearbyPlayerCard({ player, compatibilityScore, onPress }: NearbyPlayerCardProps) {
  const distanceLabel = player.distance?.readable ?? '—';
  const sports = player.sports?.slice(0, 3) ?? [];
  const isOnline = player.isOnline ?? false;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          {/* Avatar + online dot */}
          <View style={styles.avatarWrapper}>
            <Avatar
              name={player.displayName}
              photoURL={player.photoURL}
              size={52}
              showBadge
              online={isOnline}
            />
          </View>

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{player.displayName}</Text>
              {player.reputation?.trustedBadge && (
                <Text style={styles.trustIcon}>🛡️</Text>
              )}
            </View>

            {/* Sports tags */}
            <View style={styles.sportsRow}>
              {sports.map((sport) => (
                <View key={sport} style={styles.sportTag}>
                  <Text style={styles.sportTagText}>{sport}</Text>
                </View>
              ))}
              {player.sports.length > 3 && (
                <Text style={styles.moreSports}>+{player.sports.length - 3}</Text>
              )}
            </View>

            {/* Rating + distance */}
            <View style={styles.metaRow}>
              {player.rating > 0 && (
                <Text style={styles.rating}>⭐ {player.rating.toFixed(1)}</Text>
              )}
              {player.skillLevel && (
                <Badge label={player.skillLevel} style={styles.skillBadge} />
              )}
              <Text style={styles.distance}>📍 {distanceLabel}</Text>
            </View>
          </View>

          {/* Compatibility */}
          {compatibilityScore !== undefined && (
            <View style={styles.compatBox}>
              <Text style={styles.compatScore}>{compatibilityScore}%</Text>
              <Text style={styles.compatLabel}>match</Text>
            </View>
          )}
        </View>

        {/* Compatibility bar */}
        {compatibilityScore !== undefined && (
          <View style={styles.compatTrack}>
            <View style={[styles.compatFill, { width: `${compatibilityScore}%` as any }]} />
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrapper: { flexShrink: 0 },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    flex: 1,
  },
  trustIcon: { fontSize: 13 },
  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  sportTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  sportTagText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  moreSports: { fontSize: 10, color: Colors.mutedForeground, alignSelf: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rating: { fontSize: 12, color: Colors.foreground, fontWeight: '600' },
  skillBadge: { marginVertical: 0 },
  distance: { fontSize: 11, color: Colors.mutedForeground },
  compatBox: { alignItems: 'center', gap: 2, minWidth: 44 },
  compatScore: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  compatLabel: { fontSize: 9, color: Colors.mutedForeground, fontWeight: '600' },
  compatTrack: {
    height: 3,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compatFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
