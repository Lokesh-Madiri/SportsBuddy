import { create } from 'zustand';
import type { SportEvent } from '../utils/types';
import type { NearbyUser, NearbyEvent, Coordinates } from '../services/location/locationTypes';
import type { TrendingEvent } from '../services/search/searchService';

type DiscoverTab = 'events' | 'players' | 'trending';

interface DiscoverState {
  // Tab
  activeTab: DiscoverTab;
  setActiveTab: (tab: DiscoverTab) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Filters
  selectedSport: string | null;
  selectedSkillLevel: string | null;
  radiusKm: number;
  setSelectedSport: (sport: string | null) => void;
  setSelectedSkillLevel: (level: string | null) => void;
  setRadiusKm: (km: number) => void;

  // Location
  userLocation: Coordinates | null;
  setUserLocation: (coords: Coordinates | null) => void;

  // Results
  events: SportEvent[];
  nearbyEvents: NearbyEvent[];
  players: NearbyUser[];
  trending: TrendingEvent[];

  setEvents: (events: SportEvent[]) => void;
  setNearbyEvents: (events: NearbyEvent[]) => void;
  setPlayers: (players: NearbyUser[]) => void;
  setTrending: (trending: TrendingEvent[]) => void;

  // Loading
  isLoadingEvents: boolean;
  isLoadingPlayers: boolean;
  isLoadingTrending: boolean;
  setLoadingEvents: (v: boolean) => void;
  setLoadingPlayers: (v: boolean) => void;
  setLoadingTrending: (v: boolean) => void;

  // Error
  error: string | null;
  setError: (e: string | null) => void;

  // Filter sheet
  filterSheetOpen: boolean;
  setFilterSheetOpen: (open: boolean) => void;

  // Reset
  resetFilters: () => void;
}

export const useDiscoverStore = create<DiscoverState>((set) => ({
  activeTab: 'events',
  setActiveTab: (activeTab) => set({ activeTab }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  selectedSport: null,
  selectedSkillLevel: null,
  radiusKm: 25,
  setSelectedSport: (selectedSport) => set({ selectedSport }),
  setSelectedSkillLevel: (selectedSkillLevel) => set({ selectedSkillLevel }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),

  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),

  events: [],
  nearbyEvents: [],
  players: [],
  trending: [],
  setEvents: (events) => set({ events }),
  setNearbyEvents: (nearbyEvents) => set({ nearbyEvents }),
  setPlayers: (players) => set({ players }),
  setTrending: (trending) => set({ trending }),

  isLoadingEvents: false,
  isLoadingPlayers: false,
  isLoadingTrending: false,
  setLoadingEvents: (isLoadingEvents) => set({ isLoadingEvents }),
  setLoadingPlayers: (isLoadingPlayers) => set({ isLoadingPlayers }),
  setLoadingTrending: (isLoadingTrending) => set({ isLoadingTrending }),

  error: null,
  setError: (error) => set({ error }),

  filterSheetOpen: false,
  setFilterSheetOpen: (filterSheetOpen) => set({ filterSheetOpen }),

  resetFilters: () =>
    set({
      selectedSport: null,
      selectedSkillLevel: null,
      radiusKm: 25,
      searchQuery: '',
    }),
}));
