import fc from 'fast-check';
import { locationService } from './locationService';

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
