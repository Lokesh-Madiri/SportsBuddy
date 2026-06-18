import { Platform } from 'react-native';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CHANNELS,
} from './notificationConstants';
import {
  buildPayload,
  getNotificationPreferences,
  isChatMuted,
  saveNotificationPreferences,
} from './notificationHelpers';
import { reminderService } from './reminderService';
import type {
  ChatNotificationInput,
  EventCancellationInput,
  JoinRequestNotificationInput,
  MatchReminderInput,
  NotificationPreferences,
} from './notificationTypes';
import {
  AndroidImportance,
  Notification,
  NotificationResponse,
  NotificationTriggerInput,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';

let NotificationsModule: typeof import('expo-notifications') | null = null;

async function getNotifications(): Promise<typeof import('expo-notifications')> {
  if (!NotificationsModule) {
    NotificationsModule = await import('expo-notifications');
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return NotificationsModule;
}

async function scheduleLocal(
  title: string,
  body: string,
  data: object,
  channelId = 'system'
) {
  const N = await getNotifications();
  await N.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown>,
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId,
    } as NotificationTriggerInput,
  });
}

export const notificationService = {
  async initialize(): Promise<boolean> {
    // Remote push notifications disabled in Expo Go. Use Development Build or EAS Build for FCM/APNs.
    // This method requests permission only for local notifications and scheduled reminders.
    const N = await getNotifications();
    const { status: existingStatus } = await N.getPermissionsAsync();
    const { status } =
      existingStatus === 'granted'
        ? { status: existingStatus }
        : await N.requestPermissionsAsync();

    if (status !== 'granted') {
      await saveNotificationPreferences({ enabled: false });
      return false;
    }

    if (Platform.OS === 'android') {
      await Promise.all(
        Object.values(NOTIFICATION_CHANNELS).map((channel) =>
          N.setNotificationChannelAsync(channel.id, {
            name: channel.name,
            description: channel.description,
            importance: AndroidImportance.HIGH,
            vibrationPattern: [0, 180, 120, 180],
            lightColor: '#beff00',
          })
        )
      );
    }

    return true;
  },

  

  async getPreferences(): Promise<NotificationPreferences> {
    return getNotificationPreferences();
  },

  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return saveNotificationPreferences(preferences);
  },

  async scheduleEventReminder(
    eventTitle: string,
    eventDate: Date,
    minutesBefore = DEFAULT_NOTIFICATION_PREFERENCES.reminderMinutesBefore,
    eventId = eventTitle
  ): Promise<string | null> {
    const allowed = await this.initialize();
    if (!allowed) return null;

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled || !preferences.matchReminders) return null;

    return reminderService.scheduleMatchReminder({
      eventId,
      title: eventTitle,
      date: eventDate,
      minutesBefore,
    });
  },

  async scheduleMatchReminder(input: MatchReminderInput): Promise<string | null> {
    const allowed = await this.initialize();
    if (!allowed) return null;

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled || !preferences.matchReminders) return null;

    return reminderService.scheduleMatchReminder({
      ...input,
      minutesBefore: input.minutesBefore ?? preferences.reminderMinutesBefore,
    });
  },

  async scheduleAutomaticEventReminders(input: MatchReminderInput): Promise<string[]> {
    const allowed = await this.initialize();
    if (!allowed) return [];

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled || !preferences.matchReminders) return [];

    return reminderService.scheduleAutomaticReminders(input, [preferences.reminderMinutesBefore]);
  },

  async notifyJoinRequest(input: JoinRequestNotificationInput): Promise<void> {
    const allowed = await this.initialize();
    if (!allowed) return;

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled || !preferences.joinRequests) return;

    const title = 'New join request';
    const body = `${input.requesterName} wants to join ${input.eventTitle}.`;
    await scheduleLocal(
      title,
      body,
      buildPayload('join_request', title, body, {
        userId: input.organizerId,
        eventId: input.eventId,
      }),
      'social'
    );
  },

  async notifyJoinRequestDecision(
    accepted: boolean,
    eventId: string,
    eventTitle: string
  ): Promise<void> {
    const allowed = await this.initialize();
    if (!allowed) return;

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled || !preferences.joinRequests) return;

    const title = accepted ? 'Request accepted' : 'Request declined';
    const body = accepted
      ? `You're in for ${eventTitle}.`
      : `Your request for ${eventTitle} was declined.`;
    await scheduleLocal(
      title,
      body,
      buildPayload(accepted ? 'join_request_accepted' : 'join_request_rejected', title, body, {
        eventId,
      }),
      'social'
    );
  },

  async notifyChatMessage(input: ChatNotificationInput): Promise<void> {
    const allowed = await this.initialize();
    if (!allowed) return;

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled || !preferences.chatMessages || isChatMuted(preferences, input.chatId)) {
      return;
    }

    const title = `${input.senderName} in ${input.eventTitle}`;
    const body = input.messagePreview;
    await scheduleLocal(
      title,
      body,
      buildPayload('chat_message', title, body, {
        chatId: input.chatId,
      }),
      'chat'
    );
  },

  async notifyEventCancelled(input: EventCancellationInput): Promise<void> {
    const allowed = await this.initialize();
    if (!allowed) {
      await reminderService.cancelEventReminders(input.eventId);
      return;
    }

    const preferences = await getNotificationPreferences();
    await reminderService.cancelEventReminders(input.eventId);
    if (!preferences.enabled || !preferences.eventCancellations) return;

    const title = 'Match cancelled';
    const body = input.reason
      ? `${input.eventTitle} was cancelled: ${input.reason}`
      : `${input.eventTitle} was cancelled by the organizer.`;
    await scheduleLocal(
      title,
      body,
      buildPayload('event_cancelled', title, body, {
        eventId: input.eventId,
      }),
      'matches'
    );
  },

  async sendLocalNotification(title: string, body: string, data?: Record<string, string>): Promise<void> {
    const allowed = await this.initialize();
    if (!allowed) return;

    const preferences = await getNotificationPreferences();
    if (!preferences.enabled) return;

    await scheduleLocal(title, body, data || {}, 'system');
  },

  async cancelNotification(notificationId: string): Promise<void> {
    const N = await getNotifications();
    await N.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelEventReminders(eventId: string): Promise<void> {
    await reminderService.cancelEventReminders(eventId);
  },

  async cancelAllNotifications(): Promise<void> {
    const N = await getNotifications();
    await N.cancelAllScheduledNotificationsAsync();
  },

  addNotificationListener(callback: (notification: import('expo-notifications').Notification) => void) {
    return getNotifications().then(N => N.addNotificationReceivedListener(callback));
  },

  addResponseListener(callback: (response: import('expo-notifications').NotificationResponse) => void) {
    return getNotifications().then(N => N.addNotificationResponseReceivedListener(callback));
  },
};
