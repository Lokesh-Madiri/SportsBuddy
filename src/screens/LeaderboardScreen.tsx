import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, LeaderboardEntry } from '../utils/types';
import { getLeaderboard } from '../firebase/firestore';
import { GlassCard, Avatar } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { SPORTS } from '../constants';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Leaderboard'>;
  route: RouteProp<HomeStackParamList, 'Leaderboard'>;
};

const RANK_ICONS = ['🥇', '🥈', '🥉'];

const TABS = [
  { key: undefined as string | undefined, label: 'Overall' },
  ...SPORTS.slice(0, 5).map((s) => ({ key: s.name as string | undefined, label: s.icon + ' ' + s.name })),
];

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return Colors.mutedForeground;
}

export function LeaderboardScreen({ navigation, route }: Props) {
  const initialSport = route.params?.sport;
  const [selectedSport, setSelectedSport] = useState<string | undefined>(initialSport);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getLeaderboard(selectedSport, 50)
      .then((data) => { setEntries(data); setLoading(false); })
      .catch(() => { setEntries([]); setLoading(false); });
  }, [selectedSport]);

  // Run on sport change
  useEffect(() => {
    let cancelled = false;
    getLeaderboard(selectedSport, 50)
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedSport]);
  function renderEntry({ item }: { item: LeaderboardEntry }) {
    const isTop3 = item.rank <= 3;
    return (
      <GlassCard style={styles.entry} neonBorder={item.rank === 1}>
        {/* Rank */}
        <View style={styles.rankCol}>
          {item.rank <= 3 ? (
            <Text style={styles.rankIcon}>{RANK_ICONS[item.rank - 1]}</Text>
          ) : (
            <Text style={[styles.rankNum, { color: rankColor(item.rank) }]}>#{item.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <Avatar name={item.displayName} photoURL={item.photoURL} size={44} />

        {/* Info */}
        <View style={styles.entryInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName} numberOfLines={1}>{item.displayName}</Text>
            {item.trustedBadge && <Text style={styles.trustedIcon}>🛡️</Text>}
          </View>
          <Text style={styles.playerSport}>{item.sport || 'Multi-sport'}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statItem}>🎮 {item.gamesPlayed}</Text>
            <Text style={styles.statItem}>🤝 {item.sportsmanshipScore}%</Text>
            <Text style={styles.statItem}>⚡ {item.reliabilityScore}%</Text>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingCol}>
          <Text style={[styles.ratingValue, isTop3 && styles.ratingValueTop]}>
            {item.rating.toFixed(1)}
          </Text>
          <Text style={styles.ratingLabel}>rating</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>Top SportsBuddy players</Text>
          </View>
        </View>

        {/* Sport tabs */}
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.label}
          contentContainerStyle={styles.tabsRow}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              onPress={() => setSelectedSport(tab.key)}
              style={[styles.tab, selectedSport === tab.key && styles.tabActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, selectedSport === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.tabsList}
        />

        {/* List */}
        <FlatList
          data={entries}
          keyExtractor={(item) => item.uid}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>No players yet</Text>
                <Text style={styles.emptySub}>Play more games to appear here!</Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            entries.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {entries.length} player{entries.length !== 1 ? 's' : ''} ranked
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  subtitle: { fontSize: 12, color: Colors.mutedForeground, marginTop: 1 },
  tabsList: { maxHeight: 48, marginBottom: 12 },
  tabsRow: { paddingHorizontal: Spacing.lg, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground },
  tabTextActive: { color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  listHeader: { marginBottom: 12 },
  listHeaderText: { fontSize: 12, color: Colors.mutedForeground },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  entryTop3: {
    borderColor: 'rgba(190,255,0,0.25)',
  },
  rankCol: { width: 36, alignItems: 'center' },
  rankIcon: { fontSize: 22 },
  rankNum: { fontSize: 15, fontWeight: '700' },
  entryInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  playerName: { fontSize: 14, fontWeight: '700', color: Colors.foreground, flex: 1 },
  trustedIcon: { fontSize: 12 },
  playerSport: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  statItem: { fontSize: 11, color: Colors.mutedForeground },
  ratingCol: { alignItems: 'center' },
  ratingValue: { fontSize: 18, fontWeight: '800', color: Colors.foreground },
  ratingValueTop: { color: Colors.primary },
  ratingLabel: { fontSize: 9, color: Colors.mutedForeground, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 17, fontWeight: '700', color: Colors.foreground },
  emptySub: { fontSize: 13, color: Colors.mutedForeground, textAlign: 'center' },
});
