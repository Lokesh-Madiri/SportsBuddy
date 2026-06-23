import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDate } from '../../utils/helpers';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_STORAGE_KEYS,
} from './notificationConstants';
import type {
  MatchReminderInput,
  NotificationPayload,
  NotificationPreferences,
  NotificationType,
} from './notificationTypes';

export function buildPayload(
  type: NotificationType,
  title: string,
  body: string,
  metadata: Omit<NotificationPayload, 'type' | 'title' | 'body' | 'createdAt'> = {}
): NotificationPayload {
  return {
    ...metadata,
    type,
    title,
    body,
    createdAt: new Date().toISOString(),
  };
}

export function normalizePreferences(
  preferences?: Partial<NotificationPreferences> | null
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(preferences || {}),
    mutedChatIds: preferences?.mutedChatIds || [],
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEYS.preferences);
  if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    return normalizePreferences(JSON.parse(raw) as Partial<NotificationPreferences>);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const next = normalizePreferences({
    ...(await getNotificationPreferences()),
    ...preferences,
  });
  await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEYS.preferences, JSON.stringify(next));
  return next;
}

export function isChatMuted(preferences: NotificationPreferences, chatId: string): boolean {
  return preferences.mutedChatIds.includes(chatId);
}

export function formatReminderBody(input: MatchReminderInput, minutesBefore: number): string {
  if (minutesBefore >= 1440) {
    return `${input.title} is tomorrow at ${input.time || formatDate(input.date)}.`;
  }

  if (minutesBefore >= 60) {
    const hours = Math.round(minutesBefore / 60);
    return `${input.title} starts in ${hours} hour${hours === 1 ? '' : 's'}.`;
  }

  return `${input.title} starts in ${minutesBefore} minutes.`;
}

export function getReminderTriggerDate(eventDate: Date, minutesBefore: number): Date | null {
  const triggerDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
  return triggerDate.getTime() > Date.now() ? triggerDate : null;
}
