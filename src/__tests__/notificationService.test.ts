import { notificationService } from '../services/notifications/notificationService';
import { locationService } from '../services/locationService';
import type { SportEvent } from '../utils/types';
import type { Coordinates } from '../services/location/locationTypes';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../services/locationService', () => ({
  locationService: {
    getNearbyUsers: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'time_interval' },
}));

// Mock novuService so we can verify Novu trigger calls without real network requests
const mockTriggerNotification = jest.fn().mockResolvedValue(true);
jest.mock('../services/notifications/novuService', () => ({
  novuService: {
    isEnabled: jest.fn(() => true),
    upsertSubscriber: jest.fn().mockResolvedValue(true),
    updateSubscriberToken: jest.fn().mockResolvedValue(true),
    triggerNotification: mockTriggerNotification,
  },
}));

describe('NotificationService & Proximity Batching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize() robustness', () => {
    test('returns true when permissions are successfully granted', async () => {
      const allowed = await notificationService.initialize();
      expect(allowed).toBe(true);
    });

    test('returns false without throwing when an exception occurs during initialization', async () => {
      const N = require('expo-notifications');
      N.getPermissionsAsync.mockRejectedValueOnce(new Error('Native module missing'));
      
      const allowed = await notificationService.initialize();
      expect(allowed).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        '[NotificationService] Failed to initialize notifications:',
        expect.any(Error)
      );
    });
  });

  describe('notifyNearbyPlayersOfNewGame() proximity batching', () => {
    const mockEvent: SportEvent = {
      id: 'event-1',
      title: 'Pickup Soccer',
      sport: 'Soccer',
      date: new Date(),
      time: '6:00 PM',
      location: { name: 'Field 1', latitude: 40.7128, longitude: -74.0060 },
      skillLevel: 'Intermediate',
      maxPlayers: 10,
      currentPlayers: 1,
      participants: [],
      organizerId: 'org-1',
      organizerName: 'Organizer',
      status: 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCenter: Coordinates = { latitude: 40.7128, longitude: -74.0060 };

    test('does nothing if no nearby players are found', async () => {
      (locationService.getNearbyUsers as jest.Mock).mockResolvedValueOnce([]);
      
      await notificationService.notifyNearbyPlayersOfNewGame(mockEvent, mockCenter);
      
      expect(locationService.getNearbyUsers).toHaveBeenCalledWith({
        center: mockCenter,
        radiusMeters: 25000,
        limitCount: 100,
      });
      expect(console.log).toHaveBeenCalledWith('[NotificationService] No nearby players interested in', 'Soccer');
    });

    test('batches nearby users by distance and triggers Novu notifications per bracket', async () => {
      // Mock 4 players: 3 interested in Soccer (batched by distance), 1 interested in Basketball (skipped)
      const mockUsers = [
        { uid: 'u1', displayName: 'Player Close', distance: { miles: 1.0 }, sports: ['Soccer'] },
        { uid: 'u2', displayName: 'Player Mid', distance: { miles: 3.5 }, sports: ['soccer'] },
        { uid: 'u3', displayName: 'Player Far', distance: { miles: 7.2 }, sports: ['Basketball'] },
        { uid: 'u4', displayName: 'Player Very Far', distance: { miles: 15.0 }, sports: ['Soccer'] },
      ];
      
      (locationService.getNearbyUsers as jest.Mock).mockResolvedValueOnce(mockUsers);

      await notificationService.notifyNearbyPlayersOfNewGame(mockEvent, mockCenter);

      // Verify overall summary logs
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Total nearby players found in region: 4')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Player "Player Far" skipped. Reason: Not interested in Soccer (Interests: Basketball)')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Player "Player Close" is interested in Soccer')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Total interested (to notify): 3')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Total skipped: 1')
      );

      // Verify Novu triggerNotification was called once per distance bracket
      // Bracket 0-2 miles: u1 (Player Close)
      expect(mockTriggerNotification).toHaveBeenCalledWith(
        'new-nearby-game',
        ['u1'],
        expect.objectContaining({ sport: 'Soccer', eventTitle: 'Pickup Soccer', eventId: 'event-1' })
      );
      // Bracket 2-5 miles: u2 (Player Mid)
      expect(mockTriggerNotification).toHaveBeenCalledWith(
        'new-nearby-game',
        ['u2'],
        expect.objectContaining({ sport: 'Soccer', eventTitle: 'Pickup Soccer', eventId: 'event-1' })
      );
      // Bracket 10+ miles: u4 (Player Very Far)
      expect(mockTriggerNotification).toHaveBeenCalledWith(
        'new-nearby-game',
        ['u4'],
        expect.objectContaining({ sport: 'Soccer', eventTitle: 'Pickup Soccer', eventId: 'event-1' })
      );

      // triggerNotification should have been called 3 times (once per active bracket)
      expect(mockTriggerNotification).toHaveBeenCalledTimes(3);
    });
  });
});
