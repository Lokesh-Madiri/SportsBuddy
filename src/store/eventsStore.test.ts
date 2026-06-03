import fc from 'fast-check';
import { useEventsStore } from './eventsStore';
import type { SportEvent, UserLocation } from '../utils/types';

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
    locationPermission: 'undetermined',
    isLocating: false,
    locationTimestamp: null,
  });
}

describe('eventsStore location and sorting', () => {
  beforeEach(() => {
    resetStore();
  });

  test('Property 3: Events with coordinates get non-null distanceMiles', () => {
    // Feature: location-based-game-suggestions, Property 3: Events with coordinates get non-null distanceMiles
    fc.assert(
      fc.property(
        fc.record({
          lat: fc.double({ min: -90, max: 90, noNaN: true }),
          lon: fc.double({ min: -180, max: 180, noNaN: true }),
        }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lon: fc.double({ min: -180, max: 180, noNaN: true }),
          })
        ),
        (userLoc, eventCoords) => {
          resetStore();
          const store = useEventsStore.getState();

          const mockEvents = eventCoords.map((ec) => ({
            id: ec.id,
            title: 'Mock Event',
            sport: 'Basketball',
            location: {
              name: 'Mock Location',
              latitude: ec.lat,
              longitude: ec.lon,
            },
            date: new Date(),
            time: '18:00',
            skillLevel: 'Intermediate',
            maxPlayers: 10,
            currentPlayers: 5,
            participants: [],
            organizerId: 'org1',
            organizerName: 'Organizer',
            status: 'upcoming' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          store.setEvents(mockEvents);
          store.setUserLocation({ latitude: userLoc.lat, longitude: userLoc.lon });

          const updatedEvents = useEventsStore.getState().events;
          for (const event of updatedEvents) {
            expect(event.distanceMiles).not.toBeNull();
            expect(event.distanceMiles).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Events without coordinates get null distanceMiles', () => {
    // Feature: location-based-game-suggestions, Property 4: Events without coordinates get null distanceMiles
    fc.assert(
      fc.property(
        fc.record({
          lat: fc.double({ min: -90, max: 90, noNaN: true }),
          lon: fc.double({ min: -180, max: 180, noNaN: true }),
        }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            hasLat: fc.boolean(),
            hasLon: fc.boolean(),
          })
        ),
        (userLoc, eventLocMeta) => {
          resetStore();
          const store = useEventsStore.getState();

          const mockEvents = eventLocMeta.map((elm) => {
            const hasCoords = elm.hasLat && elm.hasLon;
            return {
              id: elm.id,
              title: 'Mock Event',
              sport: 'Basketball',
              location: {
                name: 'Mock Location',
                latitude: hasCoords ? 40 : undefined,
                longitude: hasCoords ? -73 : undefined,
              },
              date: new Date(),
              time: '18:00',
              skillLevel: 'Intermediate',
              maxPlayers: 10,
              currentPlayers: 5,
              participants: [],
              organizerId: 'org1',
              organizerName: 'Organizer',
              status: 'upcoming' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          });

          store.setEvents(mockEvents);
          store.setUserLocation({ latitude: userLoc.lat, longitude: userLoc.lon });

          const updatedEvents = useEventsStore.getState().events;
          for (let i = 0; i < mockEvents.length; i++) {
            const original = mockEvents[i];
            const updated = updatedEvents.find((u) => u.id === original.id)!;
            if (original.location.latitude == null || original.location.longitude == null) {
              expect(updated.distanceMiles).toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Non-null distance events precede null-distance events, non-null portion ascending', () => {
    // Feature: location-based-game-suggestions, Property 5: Non-null distance events precede null-distance events, non-null portion ascending
    fc.assert(
      fc.property(
        fc.record({
          lat: fc.double({ min: -90, max: 90, noNaN: true }),
          lon: fc.double({ min: -180, max: 180, noNaN: true }),
        }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            hasCoords: fc.boolean(),
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lon: fc.double({ min: -180, max: 180, noNaN: true }),
          })
        ),
        (userLoc, eventsMeta) => {
          resetStore();
          const store = useEventsStore.getState();

          const mockEvents = eventsMeta.map((em) => ({
            id: em.id,
            title: 'Mock Event',
            sport: 'Basketball',
            location: {
              name: 'Mock Location',
              latitude: em.hasCoords ? em.lat : undefined,
              longitude: em.hasCoords ? em.lon : undefined,
            },
            date: new Date(),
            time: '18:00',
            skillLevel: 'Intermediate',
            maxPlayers: 10,
            currentPlayers: 5,
            participants: [],
            organizerId: 'org1',
            organizerName: 'Organizer',
            status: 'upcoming' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          store.setEvents(mockEvents);
          store.setUserLocation({ latitude: userLoc.lat, longitude: userLoc.lon });

          const filtered = store.getFilteredEvents();

          // Assert the sort order: all non-null precede all null, and non-null are ascending
          let seenNull = false;
          let prevDistance = -1;

          for (const event of filtered) {
            const dist = event.distanceMiles;
            if (dist === null || dist === undefined) {
              seenNull = true;
            } else {
              // Non-null distance event
              if (seenNull) {
                // We should NOT see a non-null distance after seeing a null distance
                throw new Error('Found non-null distance event after null distance event');
              }
              expect(dist).toBeGreaterThanOrEqual(prevDistance);
              prevDistance = dist;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6: Date-ascending sort when userLocation is null', () => {
    // Feature: location-based-game-suggestions, Property 6: Date-ascending sort when userLocation is null
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            timestamp: fc.integer({ min: 0, max: 4102444800000 }), // up to year 2100
          })
        ),
        (eventsMeta) => {
          resetStore();
          const store = useEventsStore.getState();

          const mockEvents = eventsMeta.map((em) => ({
            id: em.id,
            title: 'Mock Event',
            sport: 'Basketball',
            location: {
              name: 'Mock Location',
            },
            date: new Date(em.timestamp),
            time: '18:00',
            skillLevel: 'Intermediate',
            maxPlayers: 10,
            currentPlayers: 5,
            participants: [],
            organizerId: 'org1',
            organizerName: 'Organizer',
            status: 'upcoming' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          store.setEvents(mockEvents);
          store.setUserLocation(null); // Explicitly null

          const filtered = store.getFilteredEvents();

          let prevTime = -1;
          for (const event of filtered) {
            const time = new Date(event.date).getTime();
            expect(time).toBeGreaterThanOrEqual(prevTime);
            prevTime = time;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
