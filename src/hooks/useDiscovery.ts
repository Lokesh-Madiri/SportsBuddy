import { useCallback, useEffect, useRef } from 'react';
import { useDiscoverStore } from '../store/discoverStore';
import { searchService } from '../services/search/searchService';
import { locationService } from '../services/locationService';
import { useAuthStore } from '../store/authStore';

const DEBOUNCE_MS = 350;

/**
 * Central hook for the Discover tab.
 * Handles location acquisition, debounced search, trending load, and player discovery.
 */
export function useDiscovery() {
  const { user } = useAuthStore();
  const {
    searchQuery,
    selectedSport,
    selectedSkillLevel,
    radiusKm,
    userLocation,
    activeTab,
    setUserLocation,
    setEvents,
    setNearbyEvents,
    setPlayers,
    setTrending,
    setLoadingEvents,
    setLoadingPlayers,
    setLoadingTrending,
    setError,
  } = useDiscoverStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Acquire location once on mount ───────────────────────────────────────
  useEffect(() => {
    if (userLocation) return;
    locationService.getCurrentLocation().then((coords) => {
      if (coords) setUserLocation(coords);
    });
    // userLocation and setUserLocation intentionally only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load trending (independent of query) ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'trending') return;
    setLoadingTrending(true);
    searchService.getTrending(15)
      .then(setTrending)
      .catch((err) => setError(err.message ?? 'Failed to load trending'))
      .finally(() => setLoadingTrending(false));
    // Zustand setters are stable — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Debounced search for events & players ─────────────────────────────────
  const runSearch = useCallback(async () => {
    const filters = {
      query: searchQuery,
      sport: selectedSport,
      skillLevel: selectedSkillLevel,
      radiusKm,
      location: userLocation,
    };

    if (activeTab === 'events' || activeTab === 'trending') {
      setLoadingEvents(true);
      try {
        const { events, nearbyEvents } = await searchService.searchEvents(filters);
        setEvents(events);
        setNearbyEvents(nearbyEvents);
      } catch (err: any) {
        setError(err.message ?? 'Failed to search events');
      } finally {
        setLoadingEvents(false);
      }
    }

    if (activeTab === 'players') {
      setLoadingPlayers(true);
      try {
        const players = await searchService.searchPlayers(filters);
        setPlayers(players);
      } catch (err: any) {
        setError(err.message ?? 'Failed to search players');
      } finally {
        setLoadingPlayers(false);
      }
    }
    // Zustand setters are stable references — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedSport, selectedSkillLevel, radiusKm, userLocation, activeTab]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runSearch]);

  // ─── Compatibility scoring helper ──────────────────────────────────────────
  const getCompatibility = useCallback(
    (playerUid: string, playerData: any) => {
      if (!user) return undefined;
      return searchService.scorePlayerCompatibility(user, playerData);
    },
    [user]
  );

  return { getCompatibility, runSearch };
}
