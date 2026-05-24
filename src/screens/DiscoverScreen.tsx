import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DiscoverStackParamList } from '../utils/types';
import { GlassCard, Badge } from '../components/common';
import { Colors, BorderRadius, Spacing } from '../theme';
import { SPORTS, SKILL_LEVELS } from '../constants';

type Props = {
  navigation: NativeStackNavigationProp<DiscoverStackParamList, 'DiscoverScreen'>;
};

const ALL_EVENTS = [
  { id: '1', sport: 'Basketball', title: '5v5 Pickup Game', location: 'Central Park', date: 'Today, 6 PM', players: 6, maxPlayers: 10, skillLevel: 'Intermediate', distance: '0.8 mi' },
  { id: '2', sport: 'Soccer', title: 'Weekend Kickabout', location: 'Riverside Fields', date: 'Tomorrow, 4 PM', players: 14, maxPlayers: 22, skillLevel: 'All Levels', distance: '1.2 mi' },
  { id: '3', sport: 'Tennis', title: 'Doubles Match', location: 'City Tennis Club', date: 'Sat, 10 AM', players: 2, maxPlayers: 4, skillLevel: 'Advanced', distance: '0.5 mi' },
  { id: '4', sport: 'Running', title: 'Morning 5K Run', location: 'Lakeside Trail', date: 'Sun, 7 AM', players: 8, maxPlayers: 20, skillLevel: 'Beginner', distance: '2.1 mi' },
  { id: '5', sport: 'Volleyball', title: 'Beach Volleyball', location: 'City Beach', date: 'Sat, 2 PM', players: 10, maxPlayers: 12, skillLevel: 'Intermediate', distance: '3.4 mi' },
  { id: '6', sport: 'Basketball', title: '3v3 Tournament', location: 'Sports Complex', date: 'Next Mon, 5 PM', players: 18, maxPlayers: 24, skillLevel: 'Advanced', distance: '1.8 mi' },
];

export function DiscoverScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const filtered = ALL_EVENTS.filter((e) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.sport.toLowerCase().includes(search.toLowerCase());
    const matchSport = !selectedSport || e.sport === selectedSport;
    const matchSkill = !selectedSkill || e.skillLevel === selectedSkill;
    return matchSearch && matchSport && matchSkill;
  });

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f14', '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Find games near you</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={Colors.mutedForeground + '80'}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Sport filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setSelectedSport(null)}
              style={[styles.filterChip, !selectedSport && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, !selectedSport && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {SPORTS.slice(0, 6).map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSport(selectedSport === s.name ? null : s.name)}
                style={[styles.filterChip, selectedSport === s.name && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selectedSport === s.name && styles.filterChipTextActive]}>
                  {s.icon} {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Skill filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setSelectedSkill(null)}
              style={[styles.filterChip, !selectedSkill && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, !selectedSkill && styles.filterChipTextActive]}>Any Level</Text>
            </TouchableOpacity>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setSelectedSkill(selectedSkill === level ? null : level)}
                style={[styles.filterChip, selectedSkill === level && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selectedSkill === level && styles.filterChipTextActive]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Results */}
          <View style={styles.results}>
            <Text style={styles.resultsCount}>{filtered.length} events found</Text>
            {filtered.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('MatchDetails', { eventId: event.id })}
                activeOpacity={0.85}
              >
                <GlassCard style={styles.eventCard}>
                  <View style={styles.eventTop}>
                    <View style={styles.eventLeft}>
                      <Text style={styles.eventSport}>{event.sport}</Text>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.locationRow}>
                        <Text style={styles.locationIcon}>📍</Text>
                        <Text style={styles.locationText}>{event.location}</Text>
                        <Text style={styles.distanceText}>• {event.distance}</Text>
                      </View>
                    </View>
                    <Badge label={event.skillLevel} />
                  </View>
                  <View style={styles.eventBottom}>
                    <Text style={styles.eventMeta}>🕐 {event.date}</Text>
                    <Text style={styles.eventMeta}>👥 {event.players}/{event.maxPlayers}</Text>
                    <View style={styles.joinButton}>
                      <Text style={styles.joinButtonText}>Join</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    backgroundColor: 'rgba(24,24,30,0.5)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: Colors.foreground,
    fontSize: 14,
    height: '100%',
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  results: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: 12,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  eventCard: { padding: 16 },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventLeft: { flex: 1, marginRight: 12 },
  eventSport: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: { fontSize: 11 },
  locationText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.primary,
  },
  eventBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  eventMeta: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  joinButton: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
