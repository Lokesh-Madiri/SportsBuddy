import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPORTS } from '../../constants';
import { BorderRadius, Colors, Spacing } from '../../theme';

type Props = {
  selectedSports: string[];
  favoriteSport?: string;
  onChange: (sports: string[]) => void;
  onFavoriteChange?: (sport: string) => void;
};

export function SportsInterestSelector({
  selectedSports,
  favoriteSport,
  onChange,
  onFavoriteChange,
}: Props) {
  const [search, setSearch] = useState('');
  const filteredSports = useMemo(() => SPORTS.filter((sport) =>
    sport.name.toLowerCase().includes(search.toLowerCase())
  ), [search]);

  function toggleSport(sport: string) {
    const exists = selectedSports.includes(sport);
    const nextSports = exists
      ? selectedSports.filter((item) => item !== sport)
      : [...selectedSports, sport];
    onChange(nextSports);
    if (!exists && !favoriteSport) onFavoriteChange?.(sport);
    if (exists && favoriteSport === sport) onFavoriteChange?.(nextSports[0] || '');
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search sports"
        placeholderTextColor={Colors.mutedForeground}
        style={styles.search}
      />
      <View style={styles.grid}>
        {filteredSports.map((sport) => {
          const selected = selectedSports.includes(sport.name);
          const favorite = favoriteSport === sport.name;
          return (
            <TouchableOpacity
              key={sport.id}
              onPress={() => toggleSport(sport.name)}
              onLongPress={() => selected && onFavoriteChange?.(sport.name)}
              style={[styles.chip, selected && styles.chipSelected, favorite && styles.favoriteChip]}
            >
              <Text style={styles.sportIcon}>{sport.icon}</Text>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{sport.name}</Text>
              {favorite && <Ionicons name="heart" size={12} color={Colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedSports.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoriteRow}>
          {selectedSports.map((sport) => (
            <TouchableOpacity
              key={sport}
              onPress={() => onFavoriteChange?.(sport)}
              style={[styles.favoriteButton, favoriteSport === sport && styles.favoriteButtonActive]}
            >
              <Text style={[styles.favoriteText, favoriteSport === sport && styles.favoriteTextActive]}>
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  search: {
    height: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.035)',
    color: Colors.foreground,
    paddingHorizontal: Spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.secondary,
  },
  chipSelected: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryDim,
  },
  favoriteChip: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sportIcon: { fontSize: 14 },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mutedForeground,
  },
  chipTextSelected: { color: Colors.primary },
  favoriteRow: { gap: 8 },
  favoriteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  favoriteButtonActive: { backgroundColor: Colors.primary },
  favoriteText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mutedForeground,
  },
  favoriteTextActive: { color: Colors.primaryForeground },
});
