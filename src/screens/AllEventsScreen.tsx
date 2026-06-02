import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../utils/types';
import { useEventsStore } from '../store/eventsStore';
import { GlassCard, Badge } from '../components/common';
import { Colors, Spacing, BorderRadius } from '../theme';
import { formatDate } from '../utils/helpers';
import { SPORTS } from '../constants';
import type { SportEvent } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'AllEvents'>;
};

const MOCK_ALL_EVENTS = [
  { id: 'mock_1', sport: 'Basketball', title: '5v5 Pickup Game', location: { name: 'Central Park Court' }, date: new Date(), time: '6:00 PM', skillLevel: 'Intermediate', currentPlayers: 6, maxPlayers: 10, distance: '0.8 mi', status: 'upcoming' as const, participants: [], organizerId: '', organizerName: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock_2', sport: 'Soccer', title: 'Weekend Kickabout', location: { name: 'Riverside Fields' }, date: new Date(Date.now() + 86400000), time: '4:00 PM', skillLevel: 'All Levels', currentPlayers: 14, maxPlayers: 22, distance: '1.2 mi', status: 'upcoming' as const, participants: [], organizerId: '', organizerName: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock_3', sport: 'Tennis', title: 'Doubles Match', location: { name: 'City Tennis Club' }, date: new Date(Date.now() + 172800000), time: '10:00 AM', skillLevel: 'Advanced', currentPlayers: 2, maxPlayers: 4, distance: '0.5 mi', status: 'upcoming' as const, participants: [], organizerId: '', organizerName: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock_4', sport: 'Running', title: 'Morning 5K Run', location: { name: 'Lakeside Trail' }, date: new Date(Date.now() + 259200000), time: '7:00 AM', skillLevel: 'Beginner', currentPlayers: 8, maxPlayers: 20, distance: '2.1 mi', status: 'upcoming' as const, participants: [], organizerId: '', organizerName: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock_5', sport: 'Volleyball', title: 'Beach Volleyball', location: { name: 'City Beach' }, date: new Date(Date.now() + 345600000), time: '2:00 PM', skillLevel: 'Intermediate', currentPlayers: 10, maxPlayers: 12, distance: '3.4 mi', status: 'upcoming' as const, participants: [], organizerId: '', organizerName: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock_6', sport: 'Basketball', title: '3v3 Tournament', location: { name: 'Sports Complex' }, date: new Date(Date.now() + 432000000), time: '5:00 PM', skillLevel: 'Advanced', currentPlayers: 18, maxPlayers: 24, distance: '1.8 mi', status: 'upcoming' as const, participants: [], organizerId: '', organizerName: '', createdAt: new Date(), updatedAt: new Date() },
];

export function AllEventsScreen({ navigation }: Props) {
  const { getFilteredEvents, searchQuery, setSearchQuery } = useEventsStore();
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const storeEvents = getFilteredEvents();
  const allEvents = storeEvents.length > 0 ? storeEvents : MOCK_ALL_EVENTS;
  const displayed = selectedSport ? allEvents.filter((e) => e.sport === selectedSport) : allEvents;

  function renderItem({ item }: { item: SportEvent }) {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('MatchDetails', { eventId: item.id })}
        activeOpacity={0.85}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              <Text style={styles.sportLabel}>{item.sport}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardLocation} numberOfLines={1}>
                📍 {item.location.name}{item.distance ? `  ·  ${item.distance}` : ''}
              </Text>
            </View>
            <Badge label={item.skillLevel} />
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.cardMeta}>🕐 {formatDate(item.date)}  {item.time}</Text>
            <Text style={styles.cardMeta}>👥 {item.currentPlayers}/{item.maxPlayers}</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>All Events</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={Colors.mutedForeground + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Sport filter */}
        <FlatList
          data={[{ id: 'all', name: 'All', icon: '🏅' }, ...SPORTS]}
          keyExtractor={(s) => s.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedSport(item.name === 'All' ? null : item.name)}
              style={[
                styles.filterChip,
                (item.name === 'All' ? !selectedSport : selectedSport === item.name) && styles.filterChipActive,
              ]}
            >
              <Text style={[
                styles.filterChipText,
                (item.name === 'All' ? !selectedSport : selectedSport === item.name) && styles.filterChipTextActive,
              ]}>
                {item.icon} {item.name}
              </Text>
            </TouchableOpacity>
          )}
          style={styles.filterList}
        />

        {/* Events list */}
        <FlatList
          data={displayed as SportEvent[]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏟️</Text>
              <Text style={styles.emptyText}>No events found</Text>
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: Colors.foreground, fontSize: 20, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  searchBar: {
    marginHorizontal: Spacing.lg,
    marginBottom: 12,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchInput: { color: Colors.foreground, fontSize: 14 },
  filterList: { maxHeight: 48, marginBottom: 8 },
  filterRow: { paddingHorizontal: Spacing.lg, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  filterChipText: { fontSize: 12, color: Colors.mutedForeground, fontWeight: '500' },
  filterChipTextActive: { color: Colors.primary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 10 },
  card: { padding: 16 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  sportLabel: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.foreground, marginBottom: 4 },
  cardLocation: { fontSize: 12, color: Colors.mutedForeground },
  cardBottom: { flexDirection: 'row', gap: 16 },
  cardMeta: { fontSize: 12, color: Colors.mutedForeground },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: Colors.mutedForeground },
});
