import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CreateGameScreen } from './CreateGameScreen';
import { useAuthStore } from '../store/authStore';
import { createEvent } from '../firebase/firestore';

// Mock dependencies
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('../firebase/firestore', () => ({
  createEvent: jest.fn(() => Promise.resolve('mock-event-id')),
}));
jest.mock('../services/aiService', () => ({
  aiService: {
    getEventSuggestion: jest.fn(() => Promise.resolve({ suggestedDay: 'Saturday', suggestedTime: '6:00 PM' })),
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
    expect(getByText('Step 1 of 3: Sport')).toBeTruthy();
    expect(getByText('←')).toBeTruthy(); // Back button

    // Progress indicators
    expect(getByText('Sport')).toBeTruthy();
    expect(getByText('Details')).toBeTruthy();
    expect(getByText('Review')).toBeTruthy();

    // Step 1 fields
    expect(getByText('Sport Type')).toBeTruthy();
    expect(getByText('Select a sport')).toBeTruthy();
    
    // Skill Level grid
    expect(getByText('Skill Level')).toBeTruthy();
    expect(getByText('Beginner')).toBeTruthy();
    expect(getByText('Intermediate')).toBeTruthy();
    expect(getByText('Advanced')).toBeTruthy();

    // Open Sport Picker
    fireEvent.press(getByText('Select a sport'));
    expect(getByText('⚽ Soccer')).toBeTruthy();
    expect(getByText('🏀 Basketball')).toBeTruthy();
    
    // Navigation Button
    expect(getByText('Next Step')).toBeTruthy();
    
    // Check Step 2 is not rendered
    expect(queryByText('Date (YYYY-MM-DD)')).toBeNull();
  });

  test('renders all Step 2 visual elements including Calendar and TimePicker', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Complete Step 1
    fireEvent.press(getByText('Select a sport'));
    fireEvent.press(getByText('⚽ Soccer'));
    fireEvent.press(getByText('Intermediate'));
    fireEvent.press(getByText('Next Step'));

    expect(getByText('Step 2 of 3: Details')).toBeTruthy();

    // Step 2 Fields
    expect(getByText('Date (YYYY-MM-DD)')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 2026-06-15')).toBeTruthy();
    expect(getByText('Time')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 6:00 PM')).toBeTruthy();
    expect(getByText('Location')).toBeTruthy();
    expect(getByPlaceholderText('Enter location or address')).toBeTruthy();

    // Check Calendar visual element
    fireEvent(getByPlaceholderText('e.g. 2026-06-15'), 'focus');
    expect(getByText('Su')).toBeTruthy();
    expect(getByText('Mo')).toBeTruthy();
    expect(getByText('Tu')).toBeTruthy();
    expect(getByText('◂')).toBeTruthy();
    expect(getByText('▸')).toBeTruthy();

    // Check TimePicker visual element
    fireEvent(getByPlaceholderText('e.g. 6:00 PM'), 'focus');
    expect(getByText('Select Time (6:00 PM)')).toBeTruthy();
    expect(getByText('Hour')).toBeTruthy();
    expect(getByText('Minute')).toBeTruthy();
    expect(getByText('AM / PM')).toBeTruthy();
    expect(getByText('AM')).toBeTruthy();
    expect(getByText('PM')).toBeTruthy();
    expect(getByText('Done')).toBeTruthy();

    // Back & Next buttons
    expect(getByText('Back')).toBeTruthy();
    expect(getByText('Next Step')).toBeTruthy();
  });

  test('renders all Step 3 visual elements', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<CreateGameScreen navigation={mockNavigation} />);

    // Complete Step 1
    fireEvent.press(getByText('Select a sport'));
    fireEvent.press(getByText('⚽ Soccer'));
    fireEvent.press(getByText('Intermediate'));
    fireEvent.press(getByText('Next Step'));

    // Complete Step 2
    fireEvent.changeText(getByPlaceholderText('e.g. 2026-06-15'), '2029-12-15');
    fireEvent.changeText(getByPlaceholderText('e.g. 6:00 PM'), '6:00 PM');
    fireEvent.changeText(getByPlaceholderText('Enter location or address'), 'Central Park');
    fireEvent.press(getByText('Next Step'));

    expect(getByText('Step 3 of 3: Review')).toBeTruthy();

    // Step 3 Inputs
    expect(getByText('Maximum Players')).toBeTruthy();
    expect(getByPlaceholderText('10')).toBeTruthy();
    expect(getByText('Description (optional)')).toBeTruthy();
    expect(getByPlaceholderText('Tell players what to expect...')).toBeTruthy();

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
    fireEvent.changeText(getByPlaceholderText('Enter location or address'), 'Central Park');
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

