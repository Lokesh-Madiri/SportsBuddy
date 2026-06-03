import * as Location from 'expo-location';
import type { Coordinates, LocationAddress } from './locationTypes';

const geocodeCache = new Map<string, LocationAddress>();

export const geocodingService = {
  async reverseGeocode(latitude: number, longitude: number): Promise<LocationAddress> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached) return cached;

    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = results[0];
      if (first) {
        const address: LocationAddress = {
          city: first.city || undefined,
          region: first.region || undefined,
          country: first.country || undefined,
          street: first.street || undefined,
          postalCode: first.postalCode || undefined,
          formattedAddress: formatAddress(first),
        };
        geocodeCache.set(cacheKey, address);
        return address;
      }
    } catch (error) {
      console.log('[GeocodingService Logger] ExpoLocation.reverseGeocodeAsync failed/timed out. Falling back to HTTP Nominatim...', error);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          {
            headers: {
              'User-Agent': 'SportsBuddy/1.0',
            },
          }
        );
        const data = await response.json();
        if (data && data.address) {
          const addr = data.address;
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.city_district;
          const address: LocationAddress = {
            city: city || undefined,
            region: addr.state || undefined,
            country: addr.country || undefined,
            street: addr.road || undefined,
            postalCode: addr.postcode || undefined,
            formattedAddress: data.display_name || 'Unknown location',
          };
          geocodeCache.set(cacheKey, address);
          return address;
        }
      } catch (nominatimError) {
        console.error('[GeocodingService Logger] Nominatim fallback also failed:', nominatimError);
      }
    }

    const fallbackAddress: LocationAddress = { formattedAddress: 'Unknown location' };
    geocodeCache.set(cacheKey, fallbackAddress);
    return fallbackAddress;
  },

  async getCity(coordinates: Coordinates): Promise<string | undefined> {
    const address = await this.reverseGeocode(coordinates.latitude, coordinates.longitude);
    return address.city;
  },

  formatPlace(address: Partial<LocationAddress>): string {
    return [address.city, address.region, address.country].filter(Boolean).join(', ') || 'Unknown location';
  },

  clearCache(): void {
    geocodeCache.clear();
  },
};

function formatAddress(address: Location.LocationGeocodedAddress): string {
  const street = [address.streetNumber, address.street].filter(Boolean).join(' ');
  return [street, address.city, address.region, address.country].filter(Boolean).join(', ') || 'Unknown location';
}
