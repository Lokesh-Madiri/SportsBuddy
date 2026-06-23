import React from 'react';
import fc from 'fast-check';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { useEventsStore } from '../store/eventsStore';
import { useAuthStore } from '../store/authStore';

// Mock dependencies
jest.mock('react-native-reanimated', () => {
  return {
    default: {
      View: ({ children }: any) => children,
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withSequence: (...args: any[]) => args,
    withTiming: (toValue: any) => toValue,
    withDelay: (delay: any, animation: any) => animation,
    withRepeat: (animation: any) => animation,
    cancelAnimation: () => {},
  };
});
jest.mock('react-native-worklets', () => ({
  createSerializable: (fn: any) => fn,
  Worklets: {
    createRunInJS: (fn: any) => fn,
    createRunInWorklet: (fn: any) => fn,
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('../firebase/firestore', () => ({
  subscribeToEvents: jest.fn(() => jest.fn()),
  updateUserProfile: jest.fn(),
}));
jest.mock('../services/aiService', () => ({
  aiService: {
    // Return a Promise that never resolves to prevent async setAiPicks state updates after render
    getTeammateRecommendations: jest.fn(() => new Promise(() => {})),
  },
}));
jest.mock('../hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    requestLocation: jest.fn(),
    openSettings: jest.fn(),
  }),
}));
jest.mock('../services/locationService', () => ({
  locationService: {
    getNearbyVenues: jest.fn(() => new Promise(() => {})),
  },
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe('HomeScreen location filtering properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Property 7: All events shown in "Nearby Games" have distanceMiles <= 25', () => {
    // Feature: location-based-game-suggestions, Property 7: HomeScreen 25-mile filter
    fc.assert(
      fc.property(
        fc.record({
          lat: fc.double({ min: -90, max: 90, noNaN: true }),
          lon: fc.double({ min: -180, max: 180, noNaN: true }),
        }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1 }).map((t) => `Event: ${t}`),
            distanceMiles: fc.double({ min: 0, max: 100, noNaN: true }),
          })
        ),
        (userLoc, eventsMeta) => {
          useAuthStore.setState({
            user: {
              uid: 'user-1',
              email: 'test@test.com',
              displayName: 'Test User',
              sports: [],
              stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, teammates: 0 },
              achievements: [],
              rating: 5,
              reviewCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          const mockEvents = eventsMeta.map((em) => ({
            id: em.id,
            title: em.title,
            sport: 'Basketball',
            location: {
              name: 'Mock Location',
              latitude: 40.773,
              longitude: -73.972,
            },
            date: new Date(),
            time: '18:00',
            skillLevel: 'Intermediate',
            maxPlayers: 10,
            currentPlayers: 5,
            participants: [],
            organizerId: 'org1',
            organizerName: 'Organizer',
            status: 'upcoming' as const,
            distanceMiles: em.distanceMiles,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          useEventsStore.setState({
            events: mockEvents,
            userLocation: { latitude: userLoc.lat, longitude: userLoc.lon },
            locationPermission: 'granted',
            isLocating: false,
          });

          const { queryAllByText, unmount } = render(<HomeScreen navigation={mockNavigation} />);

          for (const event of mockEvents) {
            const occurrences = queryAllByText(event.title);
            if (event.distanceMiles > 25) {
              expect(occurrences.length).toBe(0);
            } else {
              if (occurrences.length > 0) {
                expect(event.distanceMiles).toBeLessThanOrEqual(25);
              }
            }
          }
          
          // Unmount the component so it stops listening to store updates on the next fc.property run
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('HomeScreen visual elements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders essential visual elements on the home screen', () => {
    useAuthStore.setState({
      user: {
        uid: 'user-1',
        email: 'test@test.com',
        displayName: 'Test User',
      } as any,
    });

    useEventsStore.setState({
      events: [],
      userLocation: null,
      locationPermission: 'granted',
      isLocating: false,
    });

    const { getByText, getByPlaceholderText, unmount } = render(<HomeScreen navigation={mockNavigation} />);

    // Header elements
    expect(getByText('Find Your Game')).toBeTruthy();

    // Search bar
    expect(getByPlaceholderText('Search games, players, or sports...')).toBeTruthy();

    // Sections
    expect(getByText('Nearby Games')).toBeTruthy();
    expect(getByText('AI Picks')).toBeTruthy();

    // FAB icon
    expect(getByText('+')).toBeTruthy();

    unmount();
  });
});
