import { create } from 'zustand';
import type { SportEvent } from '../utils/types';

interface EventsState {
  events: SportEvent[];
  selectedEvent: SportEvent | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedSport: string | null;
  selectedSkillLevel: string | null;

  setEvents: (events: SportEvent[]) => void;
  addEvent: (event: SportEvent) => void;
  updateEvent: (eventId: string, data: Partial<SportEvent>) => void;
  setSelectedEvent: (event: SportEvent | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSport: (sport: string | null) => void;
  setSelectedSkillLevel: (level: string | null) => void;
  getFilteredEvents: () => SportEvent[];
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  selectedEvent: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedSport: null,
  selectedSkillLevel: null,

  setEvents: (events) => set({ events, isLoading: false }),

  addEvent: (event) =>
    set((state) => ({ events: [event, ...state.events] })),

  updateEvent: (eventId, data) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, ...data } : e
      ),
    })),

  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedSport: (selectedSport) => set({ selectedSport }),

  setSelectedSkillLevel: (selectedSkillLevel) => set({ selectedSkillLevel }),

  getFilteredEvents: () => {
    const { events, searchQuery, selectedSport, selectedSkillLevel } = get();
    return events.filter((event) => {
      const matchesSearch =
        !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSport = !selectedSport || event.sport === selectedSport;
      const matchesSkill = !selectedSkillLevel || event.skillLevel === selectedSkillLevel;

      return matchesSearch && matchesSport && matchesSkill;
    });
  },
}));
