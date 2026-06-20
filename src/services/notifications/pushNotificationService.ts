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
  async registerForPushNotifications(_userId?: string): Promise<string | null> {
    // Remote push notifications disabled in Expo Go
    // Use Development Build or EAS Build for FCM/APNs support
    console.warn('Push notifications disabled in Expo Go. Use Development Build or EAS Build for FCM/APNs support.');
    return null;
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