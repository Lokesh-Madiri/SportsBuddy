import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { Alert, Linking } from 'react-native';
import type {
  Coordinates,
  LocationPermissionResult,
  LocationState,
  LocationTrackingOptions,
  NearbyQueryOptions,
} from './locationTypes';
import { distanceService } from './distanceService';
import { geocodingService } from './geocodingService';
import { nearbyService } from './nearbyService';
import { clearCachedLocation, getCachedLocation, getExpoAccuracy, setCachedLocation, toCoordinates } from './locationHelpers';

let activeSubscription: LocationSubscription | null = null;
let state: LocationState = {
  isLoading: false,
  error: null,
  location: null,
  address: null,
};

export const locationService = {
  async requestPermissions(retry = false): Promise<LocationPermissionResult> {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === 'granted') {
        return { granted: true, canAskAgain: current.canAskAgain, status: 'granted' };
      }

      if (current.status === 'denied' && !current.canAskAgain && !retry) {
        return {
          granted: false,
          canAskAgain: false,
          status: 'denied',
          error: 'Location access is disabled. Enable it in settings to find nearby games.',
        };
      }

      const requested = await Location.requestForegroundPermissionsAsync();
      return {
        granted: requested.status === 'granted',
        canAskAgain: requested.canAskAgain,
        status: requested.status,
        error:
          requested.status === 'granted'
            ? undefined
            : 'SportsBuddy needs location access to show nearby matches and teammates.',
      };
    } catch {
      return {
        granted: false,
        canAskAgain: true,
        status: 'undetermined',
        error: 'Unable to request location permission. Please try again.',
      };
    }
  },

  async requestPermissionsWithAlert(retry = false): Promise<LocationPermissionResult> {
    const result = await this.requestPermissions(retry);
    if (!result.granted && result.error) {
      Alert.alert(
        'Location needed',
        result.error,
        result.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
      );
    }
    return result;
  },

  async getCurrentLocation(forceRefresh = false): Promise<Coordinates | null> {
    const cached = getCachedLocation();
    if (cached && !forceRefresh) return cached;

    state = { ...state, isLoading: true, error: null };
    const permission = await this.requestPermissions();
    if (!permission.granted) {
      state = { ...state, isLoading: false, error: permission.error || 'Location permission denied' };
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const coordinates = toCoordinates(location);
      setCachedLocation(coordinates);
      state = { ...state, isLoading: false, location: coordinates, error: null };
      return coordinates;
    } catch {
      state = { ...state, isLoading: false, error: 'Unable to get your current location.' };
      return null;
    }
  },

  async startLocationTracking(
    onLocation: (location: Coordinates) => void,
    options: LocationTrackingOptions = {}
  ): Promise<LocationPermissionResult> {
    const permission = await this.requestPermissions();
    if (!permission.granted) return permission;

    await this.stopLocationTracking();
    activeSubscription = await Location.watchPositionAsync(
      {
        accuracy: getExpoAccuracy(options.accuracy),
        distanceInterval: options.distanceIntervalMeters || 100,
        timeInterval: options.timeIntervalMs || 30000,
      },
      (location) => {
        const coordinates = toCoordinates(location);
        setCachedLocation(coordinates);
        state = { ...state, location: coordinates, error: null };
        onLocation(coordinates);
      }
    );

    return permission;
  },

  async stopLocationTracking(): Promise<void> {
    activeSubscription?.remove();
    activeSubscription = null;
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const address = await geocodingService.reverseGeocode(latitude, longitude);
    state = { ...state, address };
    return address.formattedAddress;
  },

  async getLocationAddress(coordinates: Coordinates) {
    const address = await geocodingService.reverseGeocode(coordinates.latitude, coordinates.longitude);
    state = { ...state, address };
    return address;
  },

  async updateUserLocation(userId: string, coordinates?: Coordinates) {
    const location = coordinates || (await this.getCurrentLocation());
    if (!location) return null;
    return nearbyService.updateUserLocation(userId, location);
  },

  async getNearbyUsers(options: NearbyQueryOptions) {
    return nearbyService.getNearbyUsers(options);
  },

  async getNearbyEvents(options: NearbyQueryOptions) {
    return nearbyService.getNearbyEvents(options);
  },

  async getNearbySportsGrounds(options: NearbyQueryOptions) {
    return nearbyService.getNearbySportsGrounds(options);
  },

  async getNearbyVenues(
    latitude: number,
    longitude: number,
    sport: string,
    radiusMiles: number
  ): Promise<{ name: string; distanceMiles: number; sports: string[] }[]> {
    const METERS_PER_MILE = 1609.344;
    const options = {
      center: { latitude, longitude },
      sports: [sport],
      radiusMeters: radiusMiles * METERS_PER_MILE,
    };
    const grounds = await nearbyService.getNearbySportsGrounds(options);
    return grounds.map((g) => ({
      name: g.name,
      distanceMiles: g.distance.miles,
      sports: g.sports,
    }));
  },

  suggestLocalActivities: nearbyService.suggestLocalActivities.bind(nearbyService),

  calculateDistance: distanceService.calculateDistance.bind(distanceService),
  formatDistance: distanceService.formatDistance.bind(distanceService),
  isNearby: distanceService.isNearby.bind(distanceService),

  getState(): LocationState {
    return state;
  },

  clearCache(): void {
    clearCachedLocation();
    geocodingService.clearCache();
  },
};

export * from './locationTypes';
export { distanceService } from './distanceService';
export { geocodingService } from './geocodingService';
export { nearbyService } from './nearbyService';
export { mapService } from './mapService';
