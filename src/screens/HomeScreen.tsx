import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { useAuthStore } from '../store/authStore';
import { useEventsStore } from '../store/eventsStore';
import { subscribeToEvents } from '../firebase/firestore';
import { aiService } from '../services/aiService';
import { GlassCard, Avatar, Badge } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { formatDate, timeAgo } from '../utils/helpers';
import { SPORTS } from '../constants';
import type { SportEvent, AIRecommendation } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;
};

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { events, setEvents, getFilteredEvents, searchQuery, setSearchQuery } = useEventsStore();
  const [aiPicks, setAiPicks] = useState<AIRecommendation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    // Subscribe to real-time events
    const unsubscribe = subscribeToEvents((liveEvents) => {
      setEvents(liveEvents);
    });

    // Load AI picks
    aiService.getTeammateRecommendations(user || {}).then(setAiPicks);

    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const picks = await aiService.getTeammateRecommendations(user || {});
    setAiPicks(picks);
    setRefreshing(false);
  }, [user]);

  const filteredEvents = getFilteredEvents();
  const displayEvents = selectedSport
    ? filteredEvents.filter((e) => e.sport === selectedSport)
    : filteredEvents;

  // Use mock events if Firestore is empty (demo mode)
  const eventsToShow = displayEvents.length > 0 ? displayEvents : MOCK_EVENTS;

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.headerTitle}>Find Your Game</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileScreen' as any)}
              style={styles.avatarButton}
            >
              <Avatar name={user?.displayName || 'User'} size={44} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIcon}>
              <Text style={styles.searchIconText}>🔍</Text>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search games, players, or sports..."
              placeholderTextColor={Colors.mutedForeground + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Sports Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sports</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {SPORTS.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  onPress={() =>
                    setSelectedSport(selectedSport === sport.name ? null : sport.name)
                  }
                  style={[
                    styles.sportCard,
                    selectedSport === sport.name && styles.sportCardActive,
                  ]}
                >
                  <Text style={styles.sportIcon}>{sport.icon}</Text>
                  <Text style={styles.sportName}>{sport.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Nearby Games */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Games</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllEvents' as any)}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.eventsList}>
              {eventsToShow.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => navigation.navigate('MatchDetails', { eventId: event.id })}
                />
              ))}
            </View>
          </View>

          {/* AI Picks */}
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.aiPicksHeader}>
                <Text style={styles.sectionTitle}>AI Picks</Text>
                <View style={styles.smartBadge}>
                  <Text style={styles.smartBadgeText}>✨ Smart</Text>
                </View>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.aiPicksRow}
            >
              {aiPicks.map((player) => (
                <PlayerCard key={player.userId} player={player} />
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateGame')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, onPress }: { event: SportEvent | typeof MOCK_EVENTS[0]; onPress: () => void }) {
  const sport = SPORTS.find((s) => s.name === (event as any).sport);
  const players = (event as any).currentPlayers || (event as any).players || 0;
  const maxPlayers = (event as any).maxPlayers || 10;
  const location = typeof (event as any).location === 'string'
    ? (event as any).location
    : (event as any).location?.name || 'Unknown';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.eventCard}>
        <View style={styles.eventCardTop}>
          <View>
            <Text style={styles.eventSport}>{(event as any).sport}</Text>
            <View style={styles.eventLocationRow}>
              <Text style={styles.eventLocationIcon}>📍</Text>
              <Text style={styles.eventLocation}>{location}</Text>
              {(event as any).distance && (
                <Text style={styles.eventDistance}>• {(event as any).distance}</Text>
              )}
            </View>
          </View>
          <Badge label={(event as any).skillLevel} />
        </View>
        <View style={styles.eventCardBottom}>
          <View style={styles.eventMeta}>
            <Text style={styles.eventMetaText}>
              🕐 {typeof (event as any).date === 'string'
                ? (event as any).date
                : formatDate((event as any).date as Date)}
            </Text>
            <Text style={styles.eventMetaText}>
              👥 {players}/{maxPlayers}
            </Text>
          </View>
          <View style={styles.avatarStack}>
            {[...Array(Math.min(3, players))].map((_, i) => (
              <View key={i} style={[styles.avatarStackItem, { zIndex: 3 - i }]}>
                <View style={styles.miniAvatar}>
                  <Text style={styles.miniAvatarText}>{String.fromCharCode(65 + i)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ player }: { player: AIRecommendation }) {
  return (
    <GlassCard style={styles.playerCard}>
      <Avatar name={player.displayName} size={56} />
      <Text style={styles.playerName} numberOfLines={1}>{player.displayName}</Text>
      <Text style={styles.playerSport}>{player.sport}</Text>
      <View style={styles.playerRating}>
        <Text style={styles.starIcon}>⭐</Text>
        <Text style={styles.ratingText}>{player.rating}</Text>
        <Text style={styles.matchCount}>({player.matchCount})</Text>
      </View>
      <View style={styles.compatibilityBar}>
        <View style={[styles.compatibilityFill, { width: `${player.compatibilityScore}%` as any }]} />
      </View>
      <Text style={styles.compatibilityText}>{player.compatibilityScore}% match</Text>
    </GlassCard>
  );
}

// ─── Mock Events (demo when Firestore is empty) ───────────────────────────────
const MOCK_EVENTS = [
  {
    id: 'mock_1',
    sport: 'Basketball',
    title: '5v5 Pickup Game',
    location: 'Central Park Court',
    date: 'Today, 6:00 PM',
    players: 6,
    maxPlayers: 10,
    distance: '0.8 mi',
    skillLevel: 'Intermediate',
    status: 'upcoming',
  },
  {
    id: 'mock_2',
    sport: 'Soccer',
    title: 'Weekend Kickabout',
    location: 'Riverside Fields',
    date: 'Tomorrow, 4:00 PM',
    players: 14,
    maxPlayers: 22,
    distance: '1.2 mi',
    skillLevel: 'All Levels',
    status: 'upcoming',
  },
  {
    id: 'mock_3',
    sport: 'Tennis',
    title: 'Doubles Match',
    location: 'City Tennis Club',
    date: 'Sat, 10:00 AM',
    players: 2,
    maxPlayers: 4,
    distance: '0.5 mi',
    skillLevel: 'Advanced',
    status: 'upcoming',
  },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  greeting: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.foreground,
  },
  avatarButton: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchIcon: {},
  searchIconText: { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: Colors.foreground,
    fontSize: 14,
    height: '100%',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  lastSection: {
    marginBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
  },
  categoriesRow: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  sportCard: {
    width: 80,
    height: 96,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sportCardActive: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryDim,
  },
  sportIcon: { fontSize: 28 },
  sportName: {
    fontSize: 11,
    color: Colors.foreground + 'cc',
    textAlign: 'center',
  },
  eventsList: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  eventCard: {
    padding: 16,
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventSport: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocationIcon: { fontSize: 12 },
  eventLocation: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  eventDistance: {
    fontSize: 13,
    color: Colors.primary,
  },
  eventCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  eventMetaText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarStackItem: {
    marginLeft: -8,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  aiPicksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartBadge: {
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  smartBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  aiPicksRow: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  playerCard: {
    width: 144,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  playerSport: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  playerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starIcon: { fontSize: 12 },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  matchCount: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  compatibilityBar: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  compatibilityFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  compatibilityText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.primaryForeground,
    fontWeight: '300',
    lineHeight: 32,
  },
});
