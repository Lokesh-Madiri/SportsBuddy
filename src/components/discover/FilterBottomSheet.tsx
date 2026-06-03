import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing } from '../../theme';
import { SPORTS, SKILL_LEVELS } from '../../constants';
import { PrimaryButton } from '../common';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

interface FilterBottomSheetProps {
  visible: boolean;
  selectedSport: string | null;
  selectedSkillLevel: string | null;
  radiusKm: number;
  onSportChange: (sport: string | null) => void;
  onSkillChange: (level: string | null) => void;
  onRadiusChange: (km: number) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function FilterBottomSheet({
  visible,
  selectedSport,
  selectedSkillLevel,
  radiusKm,
  onSportChange,
  onSkillChange,
  onRadiusChange,
  onApply,
  onReset,
  onClose,
}: FilterBottomSheetProps) {
  const hasFilters = !!selectedSport || !!selectedSkillLevel || radiusKm !== 25;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.sheet}>
        <SafeAreaView edges={['bottom']}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Sport */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Sport</Text>
              <View style={styles.chipGrid}>
                <TouchableOpacity
                  onPress={() => onSportChange(null)}
                  style={[styles.chip, !selectedSport && styles.chipActive]}
                >
                  <Text style={[styles.chipText, !selectedSport && styles.chipTextActive]}>
                    All Sports
                  </Text>
                </TouchableOpacity>
                {SPORTS.map((sport) => (
                  <TouchableOpacity
                    key={sport.id}
                    onPress={() => onSportChange(selectedSport === sport.name ? null : sport.name)}
                    style={[styles.chip, selectedSport === sport.name && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedSport === sport.name && styles.chipTextActive]}>
                      {sport.icon} {sport.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skill Level */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Skill Level</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  onPress={() => onSkillChange(null)}
                  style={[styles.chip, !selectedSkillLevel && styles.chipActive]}
                >
                  <Text style={[styles.chipText, !selectedSkillLevel && styles.chipTextActive]}>
                    Any
                  </Text>
                </TouchableOpacity>
                {SKILL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => onSkillChange(selectedSkillLevel === level ? null : level)}
                    style={[styles.chip, selectedSkillLevel === level && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selectedSkillLevel === level && styles.chipTextActive]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Radius */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Search Radius</Text>
              <View style={styles.chipRow}>
                {RADIUS_OPTIONS.map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => onRadiusChange(km)}
                    style={[styles.chip, radiusKm === km && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, radiusKm === km && styles.chipTextActive]}>
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {hasFilters && (
              <TouchableOpacity onPress={onReset} style={styles.resetButton}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            )}
            <PrimaryButton
              title="Apply Filters"
              onPress={onApply}
              style={styles.applyButton}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#0f0f14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.glassBorder,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
    gap: 24,
  },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  resetButton: {
    flex: 0,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  applyButton: { flex: 1 },
});
