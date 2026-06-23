import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../common';
import { BorderRadius, Colors } from '../../theme';
import { REMINDER_OPTIONS_MINUTES, type NotificationPreferences } from '../../services/notifications';

interface ReminderSettingsProps {
  preferences: NotificationPreferences;
  onChange: (preferences: Partial<NotificationPreferences>) => void;
}

function labelForMinutes(minutes: number) {
  if (minutes === 1440) return '1 day';
  if (minutes >= 60) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function ReminderSettings({ preferences, onChange }: ReminderSettingsProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>Match reminders</Text>
          <Text style={styles.subtitle}>Get a local alert before games begin.</Text>
        </View>
        <Switch
          value={preferences.matchReminders}
          onValueChange={(matchReminders) => onChange({ matchReminders })}
          trackColor={{ false: Colors.border, true: Colors.primaryDim }}
          thumbColor={preferences.matchReminders ? Colors.primary : Colors.mutedForeground}
        />
      </View>

      <View style={styles.optionRow}>
        {REMINDER_OPTIONS_MINUTES.map((minutes) => {
          const active = preferences.reminderMinutesBefore === minutes;
          return (
            <TouchableOpacity
              key={minutes}
              activeOpacity={0.82}
              onPress={() => onChange({ reminderMinutesBefore: minutes })}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {labelForMinutes(minutes)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primaryBorder,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mutedForeground,
  },
  optionTextActive: {
    color: Colors.primary,
  },
});
