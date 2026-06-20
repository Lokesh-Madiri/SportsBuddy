import fc from 'fast-check';
import { locationService } from '../services/locationService';

jest.mock('../services/location/nearbyService', () => ({
  nearbyService: {
    suggestLocalActivities: jest.fn(),
    getNearbySportsGrounds: jest.fn(async (options) => {
      const METERS_PER_MILE = 1609.344;
      const radiusMiles = options.radiusMeters / METERS_PER_MILE;
      return [
        {
          id: '1',
          name: 'Ground 1',
          sports: options.sports || [],
          location: { latitude: 0, longitude: 0 },
          eventCount: 1,
          distance: {
            meters: radiusMiles * 0.1 * METERS_PER_MILE,
            miles: radiusMiles * 0.1,
            readable: '0.1 miles away',
          },
        },
        {
          id: '2',
          name: 'Ground 2',
          sports: options.sports || [],
          location: { latitude: 0, longitude: 0 },
          eventCount: 2,
          distance: {
            meters: radiusMiles * 0.5 * METERS_PER_MILE,
            miles: radiusMiles * 0.5,
            readable: '0.5 miles away',
          },
        },
        {
          id: '3',
          name: 'Ground 3',
          sports: options.sports || [],
          location: { latitude: 0, longitude: 0 },
          eventCount: 3,
          distance: {
            meters: radiusMiles * 0.9 * METERS_PER_MILE,
            miles: radiusMiles * 0.9,
            readable: '0.9 miles away',
          },
        },
      ];
    }),
  },
}));


describe('locationService nearby venues', () => {
  test('Property 8: All returned venues have distanceMiles <= radiusMiles and list is sorted ascending', async () => {
    // Feature: location-based-game-suggestions, Property 8: All returned venues have distanceMiles <= radiusMiles and list is sorted ascending
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          lat: fc.double({ min: -90, max: 90, noNaN: true }),
          lon: fc.double({ min: -180, max: 180, noNaN: true }),
        }),
        fc.constantFrom('Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Running', 'Golf'),
        fc.double({ min: 0.1, max: 25000, noNaN: true }),
        async (coords, sport, radiusMiles) => {
          const venues = await locationService.getNearbyVenues(
            coords.lat,
            coords.lon,
            sport,
            radiusMiles
          );

          let prevDistance = -1;
          for (const venue of venues) {
            expect(venue.distanceMiles).toBeLessThanOrEqual(radiusMiles);
            expect(venue.distanceMiles).toBeGreaterThanOrEqual(prevDistance);
            prevDistance = venue.distanceMiles;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
