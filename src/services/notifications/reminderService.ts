import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_STORAGE_KEYS } from './notificationConstants';
import { buildPayload, formatReminderBody, getReminderTriggerDate } from './notificationHelpers';
import type { MatchReminderInput } from './notificationTypes';
import {
  NotificationTriggerInput,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';

let NotificationsModule: typeof import('expo-notifications') | null = null;

async function getNotifications(): Promise<typeof import('expo-notifications')> {
  if (!NotificationsModule) {
    NotificationsModule = require('expo-notifications') as typeof import('expo-notifications');
  }
  return NotificationsModule!;
}

type ReminderRegistry = Record<string, string[]>;

async function getRegistry(): Promise<ReminderRegistry> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEYS.scheduledReminders);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as ReminderRegistry;
  } catch {
    return {};
  }
}

async function saveRegistry(registry: ReminderRegistry): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEYS.scheduledReminders, JSON.stringify(registry));
}

export const reminderService = {
  async scheduleMatchReminder(input: MatchReminderInput): Promise<string | null> {
    const minutesBefore = input.minutesBefore ?? 60;
    const triggerDate = getReminderTriggerDate(input.date, minutesBefore);
    if (!triggerDate) return null;

    const body = formatReminderBody(input, minutesBefore);
    const N = await getNotifications();
    const id = await N.scheduleNotificationAsync({
      content: {
        title: 'Match reminder',
        body,
        data: buildPayload('match_reminder', input.title, body, {
          eventId: input.eventId,
          metadata: {
            sport: input.sport || '',
            time: input.time || '',
          },
        }) as unknown as Record<string, unknown>,
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: 'matches',
      } as NotificationTriggerInput,
    });

    const registry = await getRegistry();
    registry[input.eventId] = [...(registry[input.eventId] || []), id];
    await saveRegistry(registry);
    return id;
  },

  async scheduleAutomaticReminders(input: MatchReminderInput, minuteOptions: number[]): Promise<string[]> {
    const ids = await Promise.all(
      minuteOptions.map((minutesBefore) =>
        this.scheduleMatchReminder({ ...input, minutesBefore })
      )
    );
    return ids.filter(Boolean) as string[];
  },

  async cancelEventReminders(eventId: string): Promise<void> {
    const registry = await getRegistry();
    const ids = registry[eventId] || [];
    const N = await getNotifications();
    await Promise.all(ids.map((id) => N.cancelScheduledNotificationAsync(id)));
    delete registry[eventId];
    await saveRegistry(registry);
  },

  async cancelReminder(notificationId: string): Promise<void> {
    const N = await getNotifications();
    await N.cancelScheduledNotificationAsync(notificationId);
  },
};
