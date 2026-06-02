import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { locationService, type Coordinates, type NearbyEvent, type NearbyUser } from '../../services/locationService';
import { Colors, BorderRadius } from '../../theme';
import { EventMapMarkers } from './EventMapMarkers';
import { UserLocationMarker } from './UserLocationMarker';

type Props = {
  userLocation: Coordinates | null;
  events?: NearbyEvent[];
  teammates?: NearbyUser[];
  radiusMeters?: number;
  autoLocate?: boolean;
  onEventPress?: (event: NearbyEvent) => void;
  onTeammatePress?: (user: NearbyUser) => void;
};

function SportsMapComponent({
  userLocation,
  events = [],
  teammates = [],
  autoLocate = true,
  onEventPress,
  onTeammatePress,
}: Props) {
  const [detectedLocation, setDetectedLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const effectiveLocation = userLocation || detectedLocation;

  useEffect(() => {
    let mounted = true;
    if (!autoLocate || userLocation) return;

    async function detectLocation() {
      const location = await locationService.getCurrentLocation();
      if (!mounted) return;
      if (location) {
        setDetectedLocation(location);
        setLocationError(null);
      } else {
        setLocationError(locationService.getState().error);
      }
    }

    detectLocation();
    return () => {
      mounted = false;
    };
  }, [autoLocate, userLocation]);

  const region: Region = useMemo(() => ({
    latitude: effectiveLocation?.latitude ?? 37.78825,
    longitude: effectiveLocation?.longitude ?? -122.4324,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  }), [effectiveLocation]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        region={effectiveLocation ? region : undefined}
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
      >
        <UserLocationMarker coordinate={effectiveLocation} />
        <EventMapMarkers events={events} onPress={onEventPress} />
        {teammates.map((teammate) => {
          if (!teammate.location?.latitude || !teammate.location.longitude) return null;
          return (
            <Marker
              key={teammate.uid}
              coordinate={{
                latitude: teammate.location.latitude,
                longitude: teammate.location.longitude,
              }}
              title={teammate.displayName}
              description={`${teammate.sports?.[0] || 'Player'} • ${teammate.distance.readable}`}
              pinColor="#3b82f6"
              onPress={() => onTeammatePress?.(teammate)}
            />
          );
        })}
      </MapView>
      {!effectiveLocation && locationError && (
        <View style={styles.locationNotice}>
          <Text style={styles.locationNoticeText}>{locationError}</Text>
        </View>
      )}
    </View>
  );
}

export const SportsMap = memo(SportsMapComponent);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  map: {
    width: '100%',
    height: 280,
  },
  locationNotice: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  locationNoticeText: {
    fontSize: 12,
    color: Colors.foreground,
  },
});
