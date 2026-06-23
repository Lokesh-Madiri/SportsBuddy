import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react-native';
import { useUserLocation, resetSessionFlag } from '../hooks/useUserLocation';
import { locationService } from '../services/locationService';
import { updateUserProfile } from '../firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useEventsStore } from '../store/eventsStore';
import { calculateDistanceNum } from '../utils/helpers';

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openSettings: jest.fn().mockResolvedValue(true),
}));

// Mock Firestore functions
jest.mock('../firebase/firestore', () => ({
  updateUserProfile: jest.fn().mockResolvedValue(undefined),
}));

// Mock locationService
jest.mock('../services/locationService', () => ({
  locationService: {
    requestPermissions: jest.fn(),
    getCurrentLocation: jest.fn(),
    reverseGeocode: jest.fn(),
    getLocationAddress: jest.fn(),
  },
}));

function resetStore() {
  useEventsStore.setState({
    events: [],
    selectedEvent: null,
    isLoading: false,
    error: null,
    searchQuery: '',
    selectedSport: null,
    selectedSkillLevel: null,
    userLocation: null,
    locationPermission: 'granted', // Initial 'granted' to avoid useEffect on mount
    isLocating: false,
    locationTimestamp: null,
  });
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
}

describe('useUserLocation hook properties', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetSessionFlag();
    await act(async () => {
      resetStore();
    });
  });

  test('Property 9: updateUserProfile called at most once per session', async () => {
    // Feature: location-based-game-suggestions, Property 9: Location profile update is idempotent within a session
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lon: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (coordsList) => {
          jest.clearAllMocks();
          resetSessionFlag();

          await act(async () => {
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

            useEventsStore.setState({
              userLocation: null,
              locationPermission: 'granted', // avoid automatic trigger
              locationTimestamp: null,
            });
          });

          const { result } = renderHook(() => useUserLocation());

          for (const coords of coordsList) {
            // Force fetch by resetting staleness timestamp in store
            await act(async () => {
              useEventsStore.setState({ locationTimestamp: null });
            });

            (locationService.requestPermissions as jest.Mock).mockResolvedValue(true);
            (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
              latitude: coords.lat,
              longitude: coords.lon,
            });
            (locationService.getLocationAddress as jest.Mock).mockResolvedValue({
              city: 'NYC',
              country: 'USA',
            });

            await act(async () => {
              await result.current.requestLocation();
            });
          }

          const callsCount = (updateUserProfile as jest.Mock).mock.calls.length;
          expect(callsCount).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: updateUserProfile not called when movement <= 0.5 miles', async () => {
    // Feature: location-based-game-suggestions, Property 10: Profile update threshold — only on significant movement
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          lat: fc.double({ min: -80, max: 80, noNaN: true }),
          lon: fc.double({ min: -170, max: 170, noNaN: true }),
          dLat: fc.double({ min: -0.005, max: 0.005, noNaN: true }),
          dLon: fc.double({ min: -0.005, max: 0.005, noNaN: true }),
        }),
        async (data) => {
          jest.clearAllMocks();
          resetSessionFlag();

          const storedLoc = {
            latitude: data.lat,
            longitude: data.lon,
            city: 'NYC',
            country: 'USA',
          };

          const newLocCoords = {
            latitude: data.lat + data.dLat,
            longitude: data.lon + data.dLon,
          };

          await act(async () => {
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
                location: storedLoc,
              },
            });

            useEventsStore.setState({
              userLocation: null,
              locationPermission: 'granted', // avoid automatic trigger
              locationTimestamp: null,
            });
          });

          (locationService.requestPermissions as jest.Mock).mockResolvedValue(true);
          (locationService.getCurrentLocation as jest.Mock).mockResolvedValue(newLocCoords);
          (locationService.getLocationAddress as jest.Mock).mockResolvedValue({
            city: 'NYC',
            country: 'USA',
          });

          const { result } = renderHook(() => useUserLocation());

          await act(async () => {
            await result.current.requestLocation();
          });

          const distance = calculateDistanceNum(
            storedLoc.latitude,
            storedLoc.longitude,
            newLocCoords.latitude,
            newLocCoords.longitude
          );

          if (distance <= 0.5) {
            expect(updateUserProfile).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
