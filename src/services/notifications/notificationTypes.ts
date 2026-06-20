import type { EventLocation } from '../../utils/types';

export type NotificationType =
  | 'match_reminder'
  | 'join_request'
  | 'join_request_accepted'
  | 'join_request_rejected'
  | 'chat_message'
  | 'event_cancelled'
  | 'system';

export interface NotificationPayload {
  type: NotificationType;
  userId?: string;
  eventId?: string;
  chatId?: string;
  title: string;
  body: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface NotificationPreferences {
  enabled: boolean;
  matchReminders: boolean;
  joinRequests: boolean;
  chatMessages: boolean;
  eventCancellations: boolean;
  reminderMinutesBefore: number;
  mutedChatIds: string[];
}

export interface MatchReminderInput {
  eventId: string;
  title: string;
  sport?: string;
  date: Date;
  time?: string;
  location?: EventLocation | string;
  minutesBefore?: number;
}

export interface ChatNotificationInput {
  chatId: string;
  eventTitle: string;
  senderName: string;
  messagePreview: string;
}

export interface JoinRequestNotificationInput {
  eventId: string;
  eventTitle: string;
  requesterName: string;
  organizerId?: string;
}

export interface EventCancellationInput {
  eventId: string;
  eventTitle: string;
  reason?: string;
}

export interface PushTokenRecord {
  token: string;
  platform: string;
  deviceName?: string | null;
  updatedAt: string;
}
