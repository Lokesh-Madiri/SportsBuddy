import { create } from 'zustand';
import type { SportEvent, UserLocation } from '../utils/types';
import { distanceService } from '../services/location/distanceService';

interface EventsState {
  events: SportEvent[];
  selectedEvent: SportEvent | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedSport: string | null;
  selectedSkillLevel: string | null;
  userLocation: UserLocation | null;
  locationPermission: 'granted' | 'denied' | 'undetermined';
  isLocating: boolean;
  locationTimestamp: number | null;

  setEvents: (events: SportEvent[]) => void;
  addEvent: (event: SportEvent) => void;
  updateEvent: (eventId: string, data: Partial<SportEvent>) => void;
  setSelectedEvent: (event: SportEvent | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSport: (sport: string | null) => void;
  setSelectedSkillLevel: (level: string | null) => void;
  setUserLocation: (location: UserLocation | null) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'undetermined') => void;
  setIsLocating: (isLocating: boolean) => void;
  getFilteredEvents: () => SportEvent[];
}

function calculateDistanceMiles(event: SportEvent, userLoc: UserLocation | null): number | null {
  if (!userLoc || event.location.latitude == null || event.location.longitude == null) {
    return null;
  }
  try {
    const dist = distanceService.calculateDistance(
      { latitude: userLoc.latitude, longitude: userLoc.longitude },
      { latitude: event.location.latitude, longitude: event.location.longitude }
    );
    return dist.miles;
  } catch {
    return null;
  }
}

function updateEventsWithLocation(events: SportEvent[], userLoc: UserLocation | null): SportEvent[] {
  return events.map((event) => ({
    ...event,
    distanceMiles: calculateDistanceMiles(event, userLoc),
  }));
}

export const useEventsStore = create<EventsState>((set, get) => ({
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

  setEvents: (events) => {
    const { userLocation } = get();
    const updatedEvents = updateEventsWithLocation(events, userLocation);
    set({ events: updatedEvents, isLoading: false });
  },

  addEvent: (event) => {
    const { userLocation } = get();
    const updatedEvent = {
      ...event,
      distanceMiles: calculateDistanceMiles(event, userLocation),
    };
    set((state) => ({ events: [updatedEvent, ...state.events] }));
  },

  updateEvent: (eventId, data) =>
    set((state) => {
      const { userLocation } = state;
      return {
        events: state.events.map((e) => {
          if (e.id === eventId) {
            const updated = { ...e, ...data };
            return {
              ...updated,
              distanceMiles: calculateDistanceMiles(updated, userLocation),
            };
          }
          return e;
        }),
      };
    }),

  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedSport: (selectedSport) => set({ selectedSport }),

  setSelectedSkillLevel: (selectedSkillLevel) => set({ selectedSkillLevel }),

  setUserLocation: (userLocation) => {
    const { events } = get();
    const updatedEvents = updateEventsWithLocation(events, userLocation);
    set({
      userLocation,
      locationTimestamp: userLocation ? Date.now() : null,
      events: updatedEvents,
    });
  },

  setLocationPermission: (locationPermission) => set({ locationPermission }),

  setIsLocating: (isLocating) => set({ isLocating }),

  getFilteredEvents: () => {
    const { events, searchQuery, selectedSport, selectedSkillLevel, userLocation } = get();
    const filtered = events.filter((event) => {
      const matchesSearch =
        !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSport = !selectedSport || event.sport === selectedSport;
      const matchesSkill = !selectedSkillLevel || event.skillLevel === selectedSkillLevel;

      return matchesSearch && matchesSport && matchesSkill;
    });

    if (userLocation) {
      return [...filtered].sort((a, b) => {
        const distA = a.distanceMiles;
        const distB = b.distanceMiles;
        if (distA !== null && distA !== undefined && (distB === null || distB === undefined)) {
          return -1;
        }
        if ((distA === null || distA === undefined) && distB !== null && distB !== undefined) {
          return 1;
        }
        if (distA !== null && distA !== undefined && distB !== null && distB !== undefined) {
          return distA - distB;
        }
        return 0; // both null
      });
    } else {
      return [...filtered].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }
  },
}));
