import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { AdminPanelScreen } from '../screens/AdminPanelScreen';
import { notificationService } from '../services/notifications/notificationService';
import { getDocs } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';

// Mock dependencies
jest.mock('react-native-reanimated', () => ({
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
}));

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

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }), // Returns empty array to trigger mock fallback data
}));

jest.mock('../firebase/config', () => ({
  db: {},
}));

jest.mock('../services/notifications/notificationService', () => ({
  notificationService: {
    sendLocalNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe('AdminPanelScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDocs as jest.Mock).mockResolvedValue({ docs: [] });
  });

  test('renders login card initially when not authenticated', () => {
    const { getByText, getByPlaceholderText } = render(
      <AdminPanelScreen navigation={mockNavigation} />
    );

    expect(getByText('Admin Access')).toBeTruthy();
    expect(getByPlaceholderText('Enter admin username')).toBeTruthy();
    expect(getByPlaceholderText('Enter admin password')).toBeTruthy();
  });

  test('displays error message on incorrect credentials entry', () => {
    const { getByText, getByPlaceholderText } = render(
      <AdminPanelScreen navigation={mockNavigation} />
    );

    const usernameInput = getByPlaceholderText('Enter admin username');
    const passwordInput = getByPlaceholderText('Enter admin password');
    const authButton = getByText('Authenticate');

    fireEvent.changeText(usernameInput, 'admin');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(authButton);

    expect(getByText('Invalid administrator credentials.')).toBeTruthy();
  });

  test('successfully authenticates and displays metrics/charts with fallback mock data', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />
    );

    const usernameInput = getByPlaceholderText('Enter admin username');
    const passwordInput = getByPlaceholderText('Enter admin password');
    const authButton = getByText('Authenticate');

    await act(async () => {
      fireEvent.changeText(usernameInput, 'admin');
      fireEvent.changeText(passwordInput, 'admin123');
      fireEvent.press(authButton);
    });

    // Verify authentication screen is gone and main admin panel is shown after async load
    await waitFor(() => {
      expect(queryByText('Admin Access')).toBeNull();
      expect(getByText('Admin Dashboard')).toBeTruthy();
      
      // Check main stats metric labels are displayed
      expect(getByText('Total Players')).toBeTruthy();
      expect(getByText('Active Regions')).toBeTruthy();
      expect(getByText('Sports Tracked')).toBeTruthy();

      // Check places distribution is calculated and rendered
      expect(getByText('San Francisco')).toBeTruthy();
      expect(getByText('Los Angeles')).toBeTruthy();
      expect(getByText('New York')).toBeTruthy();
      expect(getByText('Brooklyn')).toBeTruthy();
    });
  });

  test('allows selecting region and triggering batch notifications', async () => {
    // Set authenticated user in useAuthStore
    useAuthStore.setState({
      user: {
        uid: 'admin-user-id',
        email: 'admin@test.com',
        displayName: 'Admin User',
        sports: [],
        stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, teammates: 0 },
        achievements: [],
        rating: 5,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Mock Firestore getDocs to return users with push tokens
    const mockUserDocs = [
      {
        id: 'm1',
        data: () => ({
          displayName: 'Lokesh Madiri',
          city: 'San Francisco',
          sports: ['Soccer'],
          fcmToken: 'expo-token-lokesh',
        }),
      },
      {
        id: 'm2',
        data: () => ({
          displayName: 'Nikhil Sky',
          city: 'San Francisco',
          sports: ['Basketball'],
          fcmToken: null, // this will be skipped
        }),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({
      docs: mockUserDocs,
    });

    // Mock fetch for remote push notifications
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'ok' } }),
    });
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = mockFetch;

    const { getByText, getByPlaceholderText } = render(
      <AdminPanelScreen navigation={mockNavigation} />
    );

    // Login
    const usernameInput = getByPlaceholderText('Enter admin username');
    const passwordInput = getByPlaceholderText('Enter admin password');
    const authButton = getByText('Authenticate');

    await act(async () => {
      fireEvent.changeText(usernameInput, 'admin');
      fireEvent.changeText(passwordInput, 'admin123');
      fireEvent.press(authButton);
    });

    // Wait for the admin page elements to load
    let sfChipButton: any;
    await waitFor(() => {
      sfChipButton = getByText('San Francisco (2)');
    });

    // Enter title & body
    const titleInput = getByPlaceholderText('e.g. Tournament Weekend!');
    const bodyInput = getByPlaceholderText(
      'e.g. New soccer matches are scheduled in your city. Check them out!'
    );

    fireEvent.changeText(titleInput, 'Game night!');
    fireEvent.changeText(bodyInput, 'Come join us at 6 PM.');

    // Select San Francisco chip
    fireEvent.press(sfChipButton);

    const sendButton = getByText('Send to San Francisco Batch');
    
    await act(async () => {
      fireEvent.press(sendButton);
    });

    // Verify remote push notification is sent via fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('expo-token-lokesh'),
        })
      );
    });

    // Restore fetch
    (globalThis as any).fetch = originalFetch;
  });
});
