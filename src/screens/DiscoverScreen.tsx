import React, { useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { DiscoverStackParamList } from '../utils/types';
import { useDiscoverStore } from '../store/discoverStore';
import { useDiscovery } from '../hooks/useDiscovery';
import {
  SearchBar,
  SportFilterChips,
  EventDiscoveryCard,
  NearbyPlayerCard,
  TrendingEventCard,
  FilterBottomSheet,
  EventSkeletonCard,
  PlayerSkeletonCard,
  EmptyState,
} from '../components/discover';
import { Colors, Spacing, BorderRadius } from '../theme';
import type { NearbyUser } from '../services/location/locationTypes';
import type { SportEvent } from '../utils/types';
import type { TrendingEvent } from '../services/search/searchService';

type Props = {
  navigation: NativeStackNavigationProp<DiscoverStackParamList, 'DiscoverScreen'>;
};

type DiscoverTab = 'events' | 'players' | 'trending';

const TABS: { key: DiscoverTab; label: string; icon: string }[] = [
  { key: 'events', label: 'Events', icon: '🏆' },
  { key: 'players', label: 'Players', icon: '👥' },
  { key: 'trending', label: 'Trending', icon: '🔥' },
];

const SKELETON_COUNT = 4;

export function DiscoverScreen({ navigation }: Props) {
  const {
    searchQuery, setSearchQuery,
    selectedSport, setSelectedSport,
    selectedSkillLevel, setSelectedSkillLevel,
    radiusKm, setRadiusKm,
    activeTab, setActiveTab,
    events, nearbyEvents, players, trending,
    isLoadingEvents, isLoadingPlayers, isLoadingTrending,
    filterSheetOpen, setFilterSheetOpen,
    resetFilters,
    userLocation,
  } = useDiscoverStore();

  const { getCompatibility, runSearch } = useDiscovery();

  const hasActiveFilters = !!(selectedSport || selectedSkillLevel || radiusKm !== 25);

  // Use nearby events (with distance) when location available, else flat events
  const displayEvents = useMemo(
    () => (nearbyEvents.length > 0 ? nearbyEvents : events) as SportEvent[],
    [nearbyEvents, events]
  );

  // ─── Render items ──────────────────────────────────────────────────────────
  const renderEvent = useCallback(
    ({ item }: { item: SportEvent }) => (
      <EventDiscoveryCard
        event={item}
        showDistance={!!userLocation}
        onPress={() => navigation.navigate('MatchDetails', { eventId: item.id })}
        onJoin={() => navigation.navigate('MatchDetails', { eventId: item.id })}
      />
    ),
    [navigation, userLocation]
  );

  const renderPlayer = useCallback(
    ({ item }: { item: NearbyUser }) => (
      <NearbyPlayerCard
        player={item}
        compatibilityScore={getCompatibility(item.uid, item)}
        onPress={() => {/* navigate to player profile when ready */}}
      />
    ),
    [getCompatibility]
  );

  const renderTrending = useCallback(
    ({ item, index }: { item: TrendingEvent; index: number }) => (
      <TrendingEventCard
        item={item}
        rank={index + 1}
        onPress={() => navigation.navigate('MatchDetails', { eventId: item.event.id })}
      />
    ),
    [navigation]
  );

  const renderEventSkeleton = () => (
    <>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <EventSkeletonCard key={i} />
      ))}
    </>
  );

  const renderPlayerSkeleton = () => (
    <>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <PlayerSkeletonCard key={i} />
      ))}
    </>
  );

  // ─── List header (search + tabs + sport chips) ─────────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Discover</Text>
          <Text style={styles.pageSubtitle}>
            {userLocation ? 'Showing results near you' : 'Find games & players'}
          </Text>
        </View>
        {userLocation && (
          <View style={styles.locationChip}>
            <Ionicons name="location" size={12} color={Colors.primary} />
            <Text style={styles.locationText}>Live</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        onFilterPress={() => setFilterSheetOpen(true)}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            activeOpacity={0.75}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sport chips (events & trending only) */}
      {activeTab !== 'players' && (
        <View style={styles.chipsWrapper}>
          <SportFilterChips
            selected={selectedSport}
            onSelect={setSelectedSport}
          />
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsCount}>
          {activeTab === 'events' && `${displayEvents.length} event${displayEvents.length !== 1 ? 's' : ''}`}
          {activeTab === 'players' && `${players.length} player${players.length !== 1 ? 's' : ''}`}
          {activeTab === 'trending' && `${trending.length} trending`}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.clearFilters}>Clear filters ×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [
    searchQuery, activeTab, selectedSport, displayEvents.length,
    players.length, trending.length, hasActiveFilters, userLocation,
  ]);

  // ─── Content by tab ────────────────────────────────────────────────────────
  if (activeTab === 'events') {
    const isLoading = isLoadingEvents;
    return (
      <LinearGradient colors={Colors.gradientDark} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <FlatList
            data={isLoading ? [] : displayEvents}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              isLoading
                ? renderEventSkeleton()
                : (
                  <EmptyState
                    icon="🏟️"
                    title="No events found"
                    subtitle={hasActiveFilters ? 'Try adjusting your filters' : 'Be the first to create a game!'}
                    actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
                    onAction={hasActiveFilters ? resetFilters : undefined}
                  />
                )
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={runSearch}
                tintColor={Colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <FilterBottomSheet
            visible={filterSheetOpen}
            selectedSport={selectedSport}
            selectedSkillLevel={selectedSkillLevel}
            radiusKm={radiusKm}
            onSportChange={setSelectedSport}
            onSkillChange={setSelectedSkillLevel}
            onRadiusChange={setRadiusKm}
            onApply={() => setFilterSheetOpen(false)}
            onReset={resetFilters}
            onClose={() => setFilterSheetOpen(false)}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (activeTab === 'players') {
    const isLoading = isLoadingPlayers;
    return (
      <LinearGradient colors={Colors.gradientDark} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <FlatList
            data={isLoading ? [] : players}
            keyExtractor={(item) => item.uid}
            renderItem={renderPlayer}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              isLoading
                ? renderPlayerSkeleton()
                : (
                  <EmptyState
                    icon="👥"
                    title="No players found"
                    subtitle="Try expanding your search radius or changing filters"
                    actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
                    onAction={hasActiveFilters ? resetFilters : undefined}
                  />
                )
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={runSearch}
                tintColor={Colors.primary}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <FilterBottomSheet
            visible={filterSheetOpen}
            selectedSport={selectedSport}
            selectedSkillLevel={selectedSkillLevel}
            radiusKm={radiusKm}
            onSportChange={setSelectedSport}
            onSkillChange={setSelectedSkillLevel}
            onRadiusChange={setRadiusKm}
            onApply={() => setFilterSheetOpen(false)}
            onReset={resetFilters}
            onClose={() => setFilterSheetOpen(false)}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Trending tab
  const isLoading = isLoadingTrending;
  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={isLoading ? [] : trending}
          keyExtractor={(item) => item.event.id}
          renderItem={renderTrending}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            isLoading
              ? renderEventSkeleton()
              : (
                <EmptyState
                  icon="🔥"
                  title="Nothing trending yet"
                  subtitle="Create a game and get players joining!"
                />
              )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={runSearch}
              tintColor={Colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    paddingHorizontal: 0, // listContent already has horizontal padding
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.foreground,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  tabIcon: { fontSize: 14 },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  chipsWrapper: {
    marginHorizontal: -Spacing.lg,
    marginBottom: 12,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  clearFilters: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  separator: { height: 10 },
});
