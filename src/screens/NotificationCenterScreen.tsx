import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GlassCard, NeonButton } from '../components/common';
import { NotificationCard, ReminderSettings } from '../components/notifications';
import { BorderRadius, Colors, Spacing } from '../theme';
import {
  notificationService,
  type NotificationPayload,
  type NotificationPreferences,
} from '../services/notifications';
import { useChatStore } from '../store/chatStore';
import { useEventsStore } from '../store/eventsStore';
import type { HomeStackParamList, ProfileStackParamList } from '../utils/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList & ProfileStackParamList>;
};

function PreferenceRow({
  title,
  subtitle,
  value,
  onChange,
  icon,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <GlassCard style={styles.preferenceRow}>
      <View style={styles.preferenceIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primaryDim }}
        thumbColor={value ? Colors.primary : Colors.mutedForeground}
      />
    </GlassCard>
  );
}

export function NotificationCenterScreen({ navigation }: Props) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const events = useEventsStore((s) => s.events);
  const totalUnread = useChatStore((s) => s.getTotalUnread());

  useEffect(() => {
    notificationService.getPreferences().then(setPreferences);
  }, []);

  const activity = useMemo<NotificationPayload[]>(() => {
    const upcoming = events.slice(0, 2).map((event) => ({
      type: 'match_reminder' as const,
      title: event.title,
      body: `Game begins at ${event.time || event.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
      eventId: event.id,
      createdAt: event.date.toISOString(),
    }));

    return [
      ...upcoming,
      {
        type: 'chat_message',
        title: 'Unread game chats',
        body: totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'} waiting.` : 'No unread messages right now.',
        createdAt: new Date().toISOString(),
      },
      {
        type: 'system',
        title: 'Local notifications ready',
        body: 'Push architecture is prepared; Expo Go uses local notifications for this MVP.',
        createdAt: new Date().toISOString(),
      },
    ];
  }, [events, totalUnread]);

  const updatePreferences = useCallback(async (next: Partial<NotificationPreferences>) => {
    setSaving(true);
    try {
      const updated = await notificationService.updatePreferences(next);
      setPreferences(updated);
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleNextReminder = useCallback(async () => {
    const event = events.find((item) => item.date.getTime() > Date.now());
    if (!event) {
      Alert.alert('No upcoming matches', 'Create or join an upcoming match to schedule a reminder.');
      return;
    }

    const id = await notificationService.scheduleMatchReminder({
      eventId: event.id,
      title: event.title,
      sport: event.sport,
      date: event.date,
      time: event.time,
    });

    Alert.alert(
      id ? 'Reminder scheduled' : 'Reminder skipped',
      id ? `${event.title} will remind you before start time.` : 'The reminder time is already in the past.'
    );
  }, [events]);

  const sendTestAlert = useCallback(async () => {
    await notificationService.sendLocalNotification(
      'SportsBuddy alert',
      'Local notifications are working for your MVP.',
      { type: 'system' }
    );
  }, []);

  if (!preferences) {
    return (
      <LinearGradient colors={Colors.gradientDark} style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.loadingText}>Loading notification controls...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Notification hub</Text>
            <Text style={styles.title}>Alerts</Text>
          </View>
          <TouchableOpacity onPress={sendTestAlert} style={styles.iconButton}>
            <Ionicons name="flash-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <GlassCard style={styles.hero} neonBorder>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroTitle}>Game-aware reminders</Text>
                <Text style={styles.heroSubtitle}>
                  Match, request, chat, and cancellation alerts are controlled from one place.
                </Text>
              </View>
              <Switch
                value={preferences.enabled}
                onValueChange={(enabled) => updatePreferences({ enabled })}
                trackColor={{ false: Colors.border, true: Colors.primaryDim }}
                thumbColor={preferences.enabled ? Colors.primary : Colors.mutedForeground}
              />
            </View>
            <NeonButton
              title={saving ? 'Saving' : 'Schedule next match'}
              icon="alarm-outline"
              loading={saving}
              onPress={scheduleNextReminder}
            />
          </GlassCard>

          <ReminderSettings preferences={preferences} onChange={updatePreferences} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alert Types</Text>
            <View style={styles.stack}>
              <PreferenceRow
                icon="person-add-outline"
                title="Join requests"
                subtitle="Organizer alerts and accept/reject decisions."
                value={preferences.joinRequests}
                onChange={(joinRequests) => updatePreferences({ joinRequests })}
              />
              <PreferenceRow
                icon="chatbubble-ellipses-outline"
                title="Chat previews"
                subtitle="Local message previews unless a chat is muted."
                value={preferences.chatMessages}
                onChange={(chatMessages) => updatePreferences({ chatMessages })}
              />
              <PreferenceRow
                icon="calendar-clear-outline"
                title="Cancellation alerts"
                subtitle="Notify participants and cancel pending reminders."
                value={preferences.eventCancellations}
                onChange={(eventCancellations) => updatePreferences({ eventCancellations })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.stack}>
              {activity.map((item, index) => (
                <NotificationCard key={`${item.type}-${index}`} notification={item} />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.mutedForeground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.foreground,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 110,
    gap: 16,
  },
  hero: {
    padding: 18,
    gap: 18,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: Colors.foreground,
  },
  heroSubtitle: {
    marginTop: 5,
    maxWidth: 260,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.mutedForeground,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.foreground,
  },
  stack: {
    gap: 10,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDim,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.foreground,
  },
  preferenceSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.mutedForeground,
  },
});
