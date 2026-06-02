import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors } from '../../theme';
import type { UserAvailability } from '../../utils/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

type Props = {
  value: UserAvailability;
  onChange: (value: UserAvailability) => void;
};

export function AvailabilitySelector({ value, onChange }: Props) {
  function toggleList(key: 'availableDays' | 'availableTimeSlots', item: string) {
    const current = value[key] || [];
    onChange({
      ...value,
      [key]: current.includes(item)
        ? current.filter((entry) => entry !== item)
        : [...current, item],
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Available days</Text>
      <View style={styles.row}>
        {DAYS.map((day) => {
          const active = value.availableDays.includes(day);
          return (
            <TouchableOpacity
              key={day}
              onPress={() => toggleList('availableDays', day)}
              style={[styles.dayChip, active && styles.activeChip]}
            >
              <Text style={[styles.chipText, active && styles.activeText]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Preferred play times</Text>
      <View style={styles.row}>
        {TIMES.map((time) => {
          const active = value.availableTimeSlots.includes(time);
          return (
            <TouchableOpacity
              key={time}
              onPress={() => toggleList('availableTimeSlots', time)}
              style={[styles.timeChip, active && styles.activeChip]}
            >
              <Text style={[styles.chipText, active && styles.activeText]}>{time}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => onChange({ ...value, weekendOnly: !value.weekendOnly })}
        style={[styles.weekendToggle, value.weekendOnly && styles.weekendToggleActive]}
      >
        <Text style={[styles.weekendText, value.weekendOnly && styles.activeText]}>
          Weekend availability
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: 44,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeChip: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeChip: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  activeText: { color: Colors.primary },
  weekendToggle: {
    height: 42,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  weekendToggleActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  weekendText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.foreground,
  },
});
