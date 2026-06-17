import { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { useEventsStore } from '../store/eventsStore';
import { useAuthStore } from '../store/authStore';
import { locationService } from '../services/locationService';
import { updateUserProfile } from '../firebase/firestore';
import { calculateDistanceNum } from '../utils/helpers';
import type { UserLocation } from '../utils/types';

// Module-level flag to ensure we only update user profile at most once per session
let profileUpdatedThisSession = false;

// Export for test resetting
export function resetSessionFlag() {
  profileUpdatedThisSession = false;
}

export function useUserLocation() {
  const { user } = useAuthStore();
  const {
    userLocation,
    locationPermission,
    locationTimestamp,
    setUserLocation,
    setLocationPermission,
    setIsLocating,
  } = useEventsStore();

  const requestLocation = useCallback(async () => {
    // Check staleness (10 minutes)
    if (userLocation && locationTimestamp && Date.now() - locationTimestamp < 10 * 60 * 1000) {
      return;
    }

    setIsLocating(true);
    const granted = await locationService.requestPermissions();
    if (granted) {
      setLocationPermission('granted');
      const coords = await locationService.getCurrentLocation();
      if (coords) {
        let city: string | undefined;
        let country: string | undefined;
        try {
          const geocode = await locationService.getLocationAddress(coords);
          if (geocode) {
            city = geocode.city;
            country = geocode.country;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        const newLocation: UserLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          city,
          country,
        };

        setUserLocation(newLocation);

        if (user && !profileUpdatedThisSession) {
          const storedLoc = user.location;
          let shouldUpdate = true;

          if (storedLoc) {
            const distance = calculateDistanceNum(
              storedLoc.latitude,
              storedLoc.longitude,
              newLocation.latitude,
              newLocation.longitude
            );
            if (distance <= 0.5) {
              shouldUpdate = false;
            }
          }

          if (shouldUpdate) {
            try {
              await updateUserProfile(user.uid, { location: newLocation });
              profileUpdatedThisSession = true;
            } catch (err) {
              console.error('Error updating user profile location:', err);
            }
          }
        }
      }
    } else {
      setLocationPermission('denied');
    }
    setIsLocating(false);
  }, [user, userLocation, locationTimestamp, setUserLocation, setLocationPermission, setIsLocating]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch((err) => console.error('Failed to open settings:', err));
  }, []);

  useEffect(() => {
    if (locationPermission === 'undetermined') {
      requestLocation();
    }
  }, [locationPermission, requestLocation]);

  return {
    requestLocation,
    openSettings,
  };
}
