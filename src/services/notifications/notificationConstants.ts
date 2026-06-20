import type { NotificationPreferences } from './notificationTypes';

export const NOTIFICATION_STORAGE_KEYS = {
  preferences: 'sportsbuddy.notification.preferences',
  scheduledReminders: 'sportsbuddy.notification.scheduledReminders',
  pushToken: 'sportsbuddy.notification.pushToken',
} as const;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  matchReminders: true,
  joinRequests: true,
  chatMessages: true,
  eventCancellations: true,
  reminderMinutesBefore: 60,
  mutedChatIds: [],
};

export const NOTIFICATION_CHANNELS = {
  matches: {
    id: 'matches',
    name: 'Match reminders',
    description: 'Upcoming match reminders and event updates',
  },
  social: {
    id: 'social',
    name: 'Join requests',
    description: 'Requests to join matches and request decisions',
  },
  chat: {
    id: 'chat',
    name: 'Chat messages',
    description: 'Game chat previews and unread message alerts',
  },
  system: {
    id: 'system',
    name: 'SportsBuddy alerts',
    description: 'Account and app updates',
  },
} as const;

export const REMINDER_OPTIONS_MINUTES = [15, 30, 60, 120, 1440] as const;
