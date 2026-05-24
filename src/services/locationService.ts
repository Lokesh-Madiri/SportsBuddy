import * as Location from 'expo-location';

export const locationService = {
  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Get current user location
   */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  },

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const { city, region, country } = results[0];
      return [city, region, country].filter(Boolean).join(', ');
    }
    return 'Unknown location';
  },
};
