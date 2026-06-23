import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { PushTokenRecord } from './notificationTypes';

// Helper function to get platform name since it's not exported from notificationHelpers
function getPlatformName(): 'ios' | 'android' | 'web' | 'unknown' {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS as 'ios' | 'android' | 'web';
  }
  return 'unknown';
}

function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Push Notification Service Stub
 * 
 * This service is a stub for future FCM/APNs integration.
 * In Expo Go, remote push notifications are disabled as per Expo SDK 56+ restrictions.
 * Local notifications are handled by the notificationService and reminderService.
 */
export const pushNotificationService = {
  /**
   * Configure Android notification channels
   * No-op in Expo Go as remote push notifications are disabled
   */
  configureAndroidChannels(): Promise<void> {
    // Remote push notifications disabled in Expo Go
    // Use Development Build or EAS Build for FCM/APNs support
    return Promise.resolve();
  },

  /**
   * Request notification permissions
   * Always returns denied status in Expo Go for remote push notifications
   */
  requestPermissions(): Promise<{ granted: boolean; status: import('expo-notifications').PermissionStatus; canAskAgain: boolean; error?: string }> {
    // Remote push notifications disabled in Expo Go
    // Use Development Build or EAS Build for FCM/APNs support
    return Promise.resolve({
      granted: false,
      status: 'undetermined' as import('expo-notifications').PermissionStatus,
      canAskAgain: false,
      error: 'Remote push notifications not available in Expo Go. Use Development Build or EAS Build for production push notifications.',
    });
  },

  /**
   * Register for push notifications
   * Always returns null in Expo Go as remote push notifications are disabled
   */
  async registerForPushNotifications(userId?: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('[Push] Must use physical device for remote push notifications');
      return null;
    }

    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('[Push] Failed to get push token: permission denied');
        return null;
      }

      // Get Expo Project ID
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      console.log('[Push] Registered Expo push token:', token);

      if (userId) {
        const { doc, setDoc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } = require('firebase/firestore');
        const { db } = require('../../firebase/config');
        const { FIRESTORE_COLLECTIONS } = require('../../constants');

        try {
          // Disassociate this token from any other users to prevent duplicate/cross-user notifications on the same device
          const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
          const q = query(usersRef, where('fcmToken', '==', token));
          const querySnapshot = await getDocs(q);

          const batch = writeBatch(db);
          let hasUpdates = false;

          querySnapshot.forEach((userDoc: any) => {
            if (userDoc.id !== userId) {
              batch.update(userDoc.ref, {
                fcmToken: null,
                updatedAt: serverTimestamp(),
              });
              hasUpdates = true;
            }
          });

          if (hasUpdates) {
            await batch.commit();
            console.log('[Push] Disassociated duplicate push token from other user documents');
          }
        } catch (err) {
          console.warn('[Push] Error disassociating duplicate push token:', err);
        }

        // Retrieve user profile to sync with Novu
        let displayName = 'Player';
        let photoURL = '';
        try {
          const userSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            displayName = userData.displayName || 'Player';
            photoURL = userData.photoURL || userData.profileImage || userData.imageURL || '';
          }
        } catch (profileErr) {
          console.warn('[Push] Failed to fetch user profile for Novu sync:', profileErr);
        }

        await setDoc(
          doc(db, FIRESTORE_COLLECTIONS.USERS, userId),
          {
            fcmToken: token, // Store the Expo push token in fcmToken field
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Sync with Novu
        try {
          const { novuService } = require('./novuService');
          await novuService.upsertSubscriber(userId, displayName, photoURL);
          await novuService.updateSubscriberToken(userId, token);
        } catch (novuErr) {
          console.warn('[Push] Failed to sync token and subscriber with Novu:', novuErr);
        }
      }

      return token;
    } catch (error) {
      console.warn('[Push] Error registering for push notifications:', error);
      return null;
    }
  },

  /**
   * Store push token
   * No-op in Expo Go as remote push notifications are disabled
   * Returns a mock record for compatibility
   */
  async storePushToken(userId: string, token: string): Promise<PushTokenRecord> {
    // Remote push notifications disabled in Expo Go
    // Use Development Build or EAS Build for FCM/APNs support
    console.warn('Push notifications disabled in Expo Go. Use Development Build or EAS Build for FCM/APNs support.');
    
    // Return a mock record that matches the PushTokenRecord interface
    return {
      token,
      platform: getPlatformName(),
      deviceName: Device.deviceName || null,
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Get push token support status
   * Returns the appropriate status based on device and Expo Go status
   */
  getPushTokenSupportStatus(): 'unsupported_expo_go' | 'unsupported_simulator' | 'ready' {
    if (!Device.isDevice) {
      return 'unsupported_simulator';
    }
    if (isRunningInExpoGo()) {
      return 'unsupported_expo_go';
    }
    return 'ready';
  },
};