import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SPORTS } from '../../constants';
import { BorderRadius, Colors, Spacing } from '../../theme';

interface SportFilterChipsProps {
  selected: string | null;
  onSelect: (sport: string | null) => void;
  showAll?: boolean;
}

export function SportFilterChips({ selected, onSelect, showAll = true }: SportFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {showAll && (
        <TouchableOpacity
          onPress={() => onSelect(null)}
          style={[styles.chip, !selected && styles.chipActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, !selected && styles.chipTextActive]}>
            🏅 All
          </Text>
        </TouchableOpacity>
      )}
      {SPORTS.map((sport) => (
        <TouchableOpacity
          key={sport.id}
          onPress={() => onSelect(selected === sport.name ? null : sport.name)}
          style={[styles.chip, selected === sport.name && styles.chipActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, selected === sport.name && styles.chipTextActive]}>
            {sport.icon} {sport.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  chipTextActive: {
    color: Colors.primary,
  },
});
