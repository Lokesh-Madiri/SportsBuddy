import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SKILL_LEVELS } from '../../constants';
import { BorderRadius, Colors } from '../../theme';
import type { SkillLevel } from '../../utils/types';

type Props = {
  sports: string[];
  skillLevels: Record<string, SkillLevel>;
  onChange: (skillLevels: Record<string, SkillLevel>) => void;
};

export function SkillLevelSelector({ sports, skillLevels, onChange }: Props) {
  if (sports.length === 0) {
    return <Text style={styles.empty}>Choose sports first to set per-sport skill levels.</Text>;
  }

  return (
    <View style={styles.container}>
      {sports.map((sport) => (
        <View key={sport} style={styles.row}>
          <Text style={styles.sportName}>{sport}</Text>
          <View style={styles.levelRow}>
            {SKILL_LEVELS.map((level) => {
              const active = (skillLevels[sport] || 'Intermediate') === level;
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => onChange({ ...skillLevels, [sport]: level as SkillLevel })}
                  style={[styles.level, active && styles.levelActive]}
                >
                  <Text style={[styles.levelText, active && styles.levelTextActive]}>{level}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  empty: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
  row: { gap: 8 },
  sportName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.foreground,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  level: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  levelTextActive: { color: Colors.primaryForeground },
});
