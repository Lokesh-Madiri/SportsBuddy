import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateGameScreen } from '../screens/CreateGameScreen';
import { useAuthStore } from '../store/authStore';
import { createEvent } from '../firebase/firestore';

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
  createEvent: jest.fn(() => Promise.resolve('mock-event-id')),
}));
jest.mock('../services/notifications', () => ({
  notificationService: {
    scheduleAutomaticEventReminders: jest.fn(() => Promise.resolve([])),
    notifyNearbyPlayersOfNewGame: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('../services/aiService', () => ({
  aiService: {
    getEventSuggestion: jest.fn(() => Promise.resolve({ suggestedDay: 'Saturday', suggestedTime: '6:00 PM' })),
    getLocationSuggestions: jest.fn(() => Promise.resolve([
      { name: 'Central Park', distance: '1.2 miles away' },
      { name: 'YMCA', distance: '2.5 miles away' }
    ])),
  },
}));
jest.mock('../services/locationService', () => ({
  locationService: {
    getCurrentLocation: jest.fn(() => Promise.resolve({ latitude: 40.7128, longitude: -74.0060 })),
  },
  geocodingService: {
    getCity: jest.fn(() => Promise.resolve('New York')),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  popToTop: jest.fn(),
} as any;

describe('CreateGameScreen - Visual Elements Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    
    useAuthStore.setState({
      user: {
        uid: 'user-1',
        email: 'test@test.com',
        displayName: 'Test User',
        rating: 4.8,
      } as any,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders all Step 1 visual elements', () => {
    const { getByText, queryByText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Header elements
    expect(getByText('Create Game')).toBeTruthy();
    expect(getByText('Step 1 of 4: Sport')).toBeTruthy();
    expect(getByText('←')).toBeTruthy(); // Back button

    // Progress indicators
    expect(getByText('Sport')).toBeTruthy();
    expect(getByText('Time')).toBeTruthy();
    expect(getByText('Location')).toBeTruthy();
    expect(getByText('Review')).toBeTruthy();

    // Step 1 fields
    expect(getByText('Sport Type')).toBeTruthy();
    expect(getByText('Select a sport')).toBeTruthy();
    
    // Skill Level grid
    expect(getByText('Skill Level')).toBeTruthy();

    // Open Sport Picker
    fireEvent.press(getByText('Select a sport'));
    expect(getByText('⚽ Soccer')).toBeTruthy();
    
    // Navigation Button
    expect(getByText('Next Step')).toBeTruthy();
    
    // Check Step 2 is not rendered
    expect(queryByText('Date (YYYY-MM-DD)')).toBeNull();
  });

  test('renders all Step 2 visual elements including Calendar and TimePicker', () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Complete Step 1
    fireEvent.press(getByText('Select a sport'));
    fireEvent.press(getByText('⚽ Soccer'));
    fireEvent.press(getByText('Intermediate'));
    fireEvent.press(getByText('Next Step'));

    expect(getByText('Step 2 of 4: Time')).toBeTruthy();

    // Step 2 Fields
    expect(getByText('Date (YYYY-MM-DD)')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 2026-06-15')).toBeTruthy();
    expect(getAllByText('Time').length).toBeGreaterThan(0);
    expect(getByPlaceholderText('e.g. 6:00 PM')).toBeTruthy();

    // Back & Next buttons
    expect(getByText('Back')).toBeTruthy();
    expect(getByText('Next Step')).toBeTruthy();
  });

  test('renders all Step 3 visual elements', () => {
    const { getByText, getByPlaceholderText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Complete Step 1
    fireEvent.press(getByText('Select a sport'));
    fireEvent.press(getByText('⚽ Soccer'));
    fireEvent.press(getByText('Intermediate'));
    fireEvent.press(getByText('Next Step'));

    // Complete Step 2
    fireEvent.changeText(getByPlaceholderText('e.g. 2026-06-15'), '2029-12-15');
    fireEvent.changeText(getByPlaceholderText('e.g. 6:00 PM'), '6:00 PM');
    fireEvent.press(getByText('Next Step'));

    expect(getByText('Step 3 of 4: Location')).toBeTruthy();

    // Step 3 Fields
    expect(getByText('Search Location')).toBeTruthy();
    expect(getByPlaceholderText('Start typing to search...')).toBeTruthy();
    expect(getByText('Publicly Available Grounds (Free)')).toBeTruthy();

    // Back & Next buttons
    expect(getByText('Back')).toBeTruthy();
    expect(getByText('Next Step')).toBeTruthy();
  });

  test('renders all Step 4 visual elements', async () => {
    const { getByText, getByPlaceholderText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Complete Step 1
    fireEvent.press(getByText('Select a sport'));
    fireEvent.press(getByText('⚽ Soccer'));
    fireEvent.press(getByText('Intermediate'));
    fireEvent.press(getByText('Next Step'));

    // Complete Step 2
    fireEvent.changeText(getByPlaceholderText('e.g. 2026-06-15'), '2029-12-15');
    fireEvent.changeText(getByPlaceholderText('e.g. 6:00 PM'), '6:00 PM');
    fireEvent.press(getByText('Next Step'));

    // Complete Step 3
    fireEvent.changeText(getByPlaceholderText('Start typing to search...'), 'Central Park');
    fireEvent.press(getByText('Next Step'));

    expect(getByText('Step 4 of 4: Review')).toBeTruthy();

    // Step 4 Inputs
    expect(getByText('Maximum Players')).toBeTruthy();
    expect(getByPlaceholderText('10')).toBeTruthy();
    expect(getByText('Description (optional)')).toBeTruthy();

    // Review Card
    expect(getByText('Review Match Details')).toBeTruthy();
    expect(getByText('Sport:')).toBeTruthy();
    expect(getByText('Soccer')).toBeTruthy();
    expect(getByText('Skill Level:')).toBeTruthy();
    expect(getByText('Intermediate')).toBeTruthy();
    expect(getByText('Date & Time:')).toBeTruthy();
    expect(getByText('2029-12-15 at 6:00 PM')).toBeTruthy();
    expect(getByText('Location:')).toBeTruthy();
    expect(getByText('Central Park')).toBeTruthy();
    expect(getByText('Max Players:')).toBeTruthy();
    expect(getByText('10 Players')).toBeTruthy();

    // AI Suggestion card should appear
    await waitFor(() => {
      expect(getByText('AI Suggestion')).toBeTruthy();
      expect(getByText(
        'Based on your preferences, we recommend hosting on Saturdays at 6:00 PM for maximum player turnout.'
      )).toBeTruthy();
    });

    // Back & Publish buttons
    expect(getByText('Back')).toBeTruthy();
    expect(getByText('Publish Game')).toBeTruthy();
  });

  test('submits and formats date correctly', async () => {
    const { getByText, getByPlaceholderText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Wizard
    fireEvent.press(getByText('Select a sport'));
    fireEvent.press(getByText('⚽ Soccer'));
    fireEvent.press(getByText('Intermediate'));
    fireEvent.press(getByText('Next Step'));
    fireEvent.changeText(getByPlaceholderText('e.g. 2026-06-15'), '2029-12-15');
    fireEvent.changeText(getByPlaceholderText('e.g. 6:00 PM'), '6:00 PM');
    fireEvent.press(getByText('Next Step'));
    fireEvent.changeText(getByPlaceholderText('Start typing to search...'), 'Central Park');
    fireEvent.press(getByText('Next Step'));
    fireEvent.changeText(getByPlaceholderText('Tell players what to expect...'), 'Good game');
    
    fireEvent.press(getByText('Publish Game'));

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
        sport: 'Soccer',
        skillLevel: 'Intermediate',
        time: '6:00 PM',
        description: 'Good game',
        location: { name: 'Central Park' },
        maxPlayers: 10,
        // The date object gets generated by parseDateTime(2029-12-15, 6:00 PM)
        date: new Date(2029, 11, 15, 18, 0)
      }));
    });
  });
});
