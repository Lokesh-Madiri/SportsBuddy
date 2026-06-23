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
import type { SportEvent } from '../../utils/types';
import type { Coordinates } from '../location/locationTypes';
import { locationService } from '../locationService';
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
    NotificationsModule = require('expo-notifications') as typeof import('expo-notifications');
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
    try {
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
    } catch (e) {
      console.warn('[NotificationService] Failed to initialize notifications:', e);
      return false;
    }
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

    // Trigger real push notification via Novu
    try {
      const { novuService } = require('./novuService');
      await novuService.triggerNotification('join-request', [input.organizerId], {
        requesterName: input.requesterName,
        eventTitle: input.eventTitle,
        eventId: input.eventId,
      });
    } catch (err) {
      console.warn('[NotificationService] Failed to send Novu join-request push:', err);
    }
  },

  async notifyJoinRequestDecision(
    accepted: boolean,
    eventId: string,
    eventTitle: string,
    requesterId?: string
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

    // Trigger real push notification via Novu
    if (requesterId) {
      try {
        const { novuService } = require('./novuService');
        await novuService.triggerNotification('join-request-decision', [requesterId], {
          decisionTitle: title,
          decisionBody: body,
          eventId,
          eventTitle,
          accepted,
        });
      } catch (err) {
        console.warn('[NotificationService] Failed to send Novu join-request-decision push:', err);
      }
    }
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

    // Trigger real push notifications via Novu to all participants
    try {
      const { db } = require('../../firebase/config');
      const { doc, getDoc } = require('firebase/firestore');
      const { FIRESTORE_COLLECTIONS } = require('../../constants');

      const eventSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.EVENTS, input.eventId));
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        const participants: any[] = eventData.participants || [];
        const participantIds = participants
          .map((p) => p.uid)
          .filter((uid) => uid !== eventData.organizerId);

        if (participantIds.length > 0) {
          const { novuService } = require('./novuService');
          await novuService.triggerNotification('event-cancelled', participantIds, {
            eventTitle: input.eventTitle,
            reason: input.reason || 'by the organizer',
            eventId: input.eventId,
          });
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to notify event cancellation via Novu:', err);
    }
  },

  async notifyNearbyPlayersOfNewGame(event: SportEvent, center: Coordinates): Promise<void> {
    try {
      // 1. Get all nearby users (radius 25km, limit 100) in the region
      const allNearbyUsers = await locationService.getNearbyUsers({
        center,
        radiusMeters: 25000,
        limitCount: 100,
      });

      console.log(`[NotificationService] Total nearby players found in region: ${allNearbyUsers.length}`);

      const targetSportLower = event.sport.toLowerCase();
      const interestedUsers: typeof allNearbyUsers = [];
      const skippedUsers: { displayName: string; reason: string; distance: number }[] = [];

      for (const u of allNearbyUsers) {
        const hasInterest = u.sports?.some((s) => s.toLowerCase() === targetSportLower);
        const distanceMiles = u.distance.miles;

        if (hasInterest) {
          interestedUsers.push(u);
          console.log(
            `[NotificationService] Player "${u.displayName || 'Unknown Player'}" is interested in ${event.sport}. Staging for notification. (Distance: ${distanceMiles.toFixed(2)} miles)`
          );
        } else {
          const interests = u.sports && u.sports.length > 0 ? u.sports.join(', ') : 'none';
          const reason = `Not interested in ${event.sport} (Interests: ${interests})`;
          skippedUsers.push({ displayName: u.displayName || 'Unknown Player', reason, distance: distanceMiles });
          console.log(
            `[NotificationService] Player "${u.displayName || 'Unknown Player'}" skipped. Reason: ${reason} (Distance: ${distanceMiles.toFixed(2)} miles)`
          );
        }
      }

      console.log(`[NotificationService] Notification Summary:`);
      console.log(`  - Total players in range: ${allNearbyUsers.length}`);
      console.log(`  - Total interested (to notify): ${interestedUsers.length}`);
      console.log(`  - Total skipped: ${skippedUsers.length}`);

      if (interestedUsers.length === 0) {
        console.log('[NotificationService] No nearby players interested in', event.sport);
        return;
      }

      // 2. Batch users by distance brackets (e.g. 0-2 miles, 2-5 miles, 5-10 miles, 10+ miles)
      const brackets: { min: number; max: number; users: typeof interestedUsers }[] = [
        { min: 0, max: 2, users: [] },
        { min: 2, max: 5, users: [] },
        { min: 5, max: 10, users: [] },
        { min: 10, max: 99999, users: [] },
      ];

      for (const u of interestedUsers) {
        const miles = u.distance.miles;
        const bracket = brackets.find((b) => miles >= b.min && miles < b.max);
        if (bracket) bracket.users.push(u);
      }

      // Filter out empty brackets
      const activeBrackets = brackets.filter((b) => b.users.length > 0);

      // 3. Process batches sequentially with a delay between them
      for (let i = 0; i < activeBrackets.length; i++) {
        const bracket = activeBrackets[i];
        console.log(
          `[NotificationService] Sending notification batch ${i + 1}/${activeBrackets.length} to ${
            bracket.users.length
          } users located between ${bracket.min} and ${bracket.max} miles away...`
        );

        // Send push notifications via Novu to the batch of interested users
        const userIds = bracket.users.map((u) => u.uid);
        if (userIds.length > 0) {
          try {
            const { novuService } = require('./novuService');
            await novuService.triggerNotification('new-nearby-game', userIds, {
              sport: event.sport,
              eventTitle: event.title,
              eventId: event.id,
            });
          } catch (err) {
            console.warn('[NotificationService] Failed to notify nearby players via Novu:', err);
          }
        }

        // Wait 1.5 seconds between batches to stagger delivery (0ms in tests to avoid timeouts)
        if (i < activeBrackets.length - 1) {
          const delay = process.env.NODE_ENV === 'test' ? 0 : 1500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Failed to notify nearby players:', e);
    }
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
