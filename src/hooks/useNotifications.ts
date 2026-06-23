import { useEffect, useRef } from 'react';

import { notificationService } from '../services/notifications';

import { useAuthStore } from '../store/authStore';

type EventSubscription = import('expo-notifications').EventSubscription;

export function useNotifications() {
  const { user } = useAuthStore();

  const notificationListener =
    useRef<EventSubscription | null>(
      null
    );

  const responseListener =
    useRef<EventSubscription | null>(
      null
    );

  useEffect(() => {
    let mounted = true;

    if (user?.uid) {
      const { pushNotificationService } = require('../services/notifications/pushNotificationService');
      pushNotificationService.registerForPushNotifications(user.uid);
    }

    // Listen for notifications received
    notificationService.addNotificationListener(
      (notification) => {
        console.log(
          'Notification received:',
          notification.request.content.title
        );
      }
    ).then(sub => {
      if (mounted) {
        notificationListener.current = sub;
      }
    });

    // Listen for notification taps
    notificationService.addResponseListener(
      (response) => {
        const data =
          response.notification.request.content
            .data;

        console.log(
          'Notification tapped:',
          data
        );

        // TODO:
        // Navigate based on notification type
      }
    ).then(sub => {
      if (mounted) {
        responseListener.current = sub;
      }
    });

    return () => {
      mounted = false;
      notificationListener.current?.remove();

      responseListener.current?.remove();
    };
  }, [user?.uid]);

  return {
    scheduleReminder:
      notificationService.scheduleEventReminder.bind(
        notificationService
      ),

    scheduleMatchReminder:
      notificationService.scheduleMatchReminder.bind(
        notificationService
      ),

    sendLocal:
      notificationService.sendLocalNotification.bind(
        notificationService
      ),

    notifyChatMessage:
      notificationService.notifyChatMessage.bind(
        notificationService
      ),

    notifyJoinRequest:
      notificationService.notifyJoinRequest.bind(
        notificationService
      ),

    notifyEventCancelled:
      notificationService.notifyEventCancelled.bind(
        notificationService
      ),
  };
}