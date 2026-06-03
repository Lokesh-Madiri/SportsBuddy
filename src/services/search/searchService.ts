/**
 * Search & Discovery Service
 * Handles event search, player search, trending calculation, and recommendations.
 * All heavy queries are client-side filtered to avoid composite Firestore indexes.
 */

import { getEvents, getUsers } from '../../firebase/firestore';
import { locationService } from '../locationService';
import type { SportEvent, User } from '../../utils/types';
import type { NearbyEvent, NearbyUser, Coordinates } from '../location/locationTypes';
import { SPORTS } from '../../constants';

// ─── Search Types ─────────────────────────────────────────────────────────────
export interface SearchFilters {
  query?: string;
  sport?: string | null;
  skillLevel?: string | null;
  radiusKm?: number;
  location?: Coordinates | null;
}

export interface TrendingEvent {
  event: SportEvent;
  trendScore: number;
  reason: string;
}

export interface SearchResults {
  events: SportEvent[];
  nearbyEvents: NearbyEvent[];
  players: NearbyUser[];
  trending: TrendingEvent[];
  isLoading: boolean;
  error: string | null;
}

// ─── Trending Algorithm ───────────────────────────────────────────────────────
/**
 * Trending score considers:
 *   - Fill rate (players/maxPlayers) — 40%
 *   - Recency (created within last 24h) — 20%
 *   - Rating of organizer — 20%
 *   - Activity (joins vs time) — 20%
 */
export function calcTrendScore(event: SportEvent): number {
  const fillRate = event.maxPlayers > 0
    ? event.currentPlayers / event.maxPlayers
    : 0;

  const ageHours = (Date.now() - event.createdAt.getTime()) / 3600000;
  const recency = Math.max(0, 1 - ageHours / 72); // decay over 72 hours

  const rating = (event.organizerRating || 3) / 5;

  const joinVelocity = ageHours > 0
    ? Math.min(1, event.currentPlayers / Math.max(1, ageHours))
    : 0;

  return (fillRate * 0.4) + (recency * 0.2) + (rating * 0.2) + (joinVelocity * 0.2);
}

function trendReason(event: SportEvent): string {
  const fillPct = Math.round((event.currentPlayers / Math.max(1, event.maxPlayers)) * 100);
  const spotsLeft = event.maxPlayers - event.currentPlayers;
  if (fillPct >= 80) return `Almost full — only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`;
  if (event.currentPlayers >= 8) return `${event.currentPlayers} players already joined`;
  const ageHours = (Date.now() - event.createdAt.getTime()) / 3600000;
  if (ageHours < 6) return 'Just posted';
  return 'Popular in your area';
}

// ─── Client-side text search ──────────────────────────────────────────────────
function matchesQuery(query: string, event: SportEvent): boolean {
  const q = query.toLowerCase();
  return (
    event.title.toLowerCase().includes(q) ||
    event.sport.toLowerCase().includes(q) ||
    event.location.name.toLowerCase().includes(q) ||
    (event.location.address?.toLowerCase().includes(q) ?? false) ||
    event.organizerName.toLowerCase().includes(q)
  );
}

function matchesPlayerQuery(query: string, user: User): boolean {
  const q = query.toLowerCase();
  return (
    user.displayName.toLowerCase().includes(q) ||
    (user.username?.toLowerCase().includes(q) ?? false) ||
    user.sports.some((s) => s.toLowerCase().includes(q))
  );
}

// ─── Main Search Service ──────────────────────────────────────────────────────
export const searchService = {
  /**
   * Search events with optional location-based distance filtering.
   * Returns both flat list and NearbyEvent[] with distance attached.
   */
  async searchEvents(filters: SearchFilters): Promise<{
    events: SportEvent[];
    nearbyEvents: NearbyEvent[];
  }> {
    // Fetch all upcoming events (client-side filtered)
    const allEvents = await getEvents({ limitCount: 100 });

    let results = allEvents;

    // Text filter
    if (filters.query?.trim()) {
      results = results.filter((e) => matchesQuery(filters.query!, e));
    }

    // Sport filter
    if (filters.sport) {
      results = results.filter((e) => e.sport === filters.sport);
    }

    // Skill filter
    if (filters.skillLevel) {
      results = results.filter((e) => e.skillLevel === filters.skillLevel);
    }

    // Location-based distance filter + attach distance
    let nearbyEvents: NearbyEvent[] = [];
    if (filters.location) {
      const nearby = await locationService.getNearbyEvents({
        center: filters.location,
        radiusMeters: (filters.radiusKm ?? 25) * 1000,
        sports: filters.sport ? [filters.sport] : undefined,
        skillLevel: filters.skillLevel ?? undefined,
        limitCount: 100,
      });

      // Merge text-query filter onto nearby results
      nearbyEvents = filters.query?.trim()
        ? nearby.filter((e) => matchesQuery(filters.query!, e as unknown as SportEvent))
        : nearby;

      // Use nearby as the main results if location is available
      results = nearbyEvents as unknown as SportEvent[];
    }

    return { events: results, nearbyEvents };
  },

  /**
   * Search players / nearby users.
   */
  async searchPlayers(filters: SearchFilters): Promise<NearbyUser[]> {
    if (!filters.location) {
      // No location — fallback to top-rated users with text filter
      const users = await getUsers(50);
      let results = users as NearbyUser[];
      if (filters.query?.trim()) {
        results = results.filter((u) => matchesPlayerQuery(filters.query!, u));
      }
      if (filters.sport) {
        results = results.filter((u) =>
          u.sports.some((s) => s.toLowerCase() === filters.sport!.toLowerCase())
        );
      }
      if (filters.skillLevel) {
        results = results.filter((u) => u.skillLevel === filters.skillLevel);
      }
      // Attach dummy distance
      return results.map((u) => ({
        ...u,
        distance: { meters: 0, kilometers: 0, miles: 0, readable: '—' },
      }));
    }

    const nearby = await locationService.getNearbyUsers({
      center: filters.location,
      radiusMeters: (filters.radiusKm ?? 25) * 1000,
      sports: filters.sport ? [filters.sport] : undefined,
      skillLevel: filters.skillLevel ?? undefined,
      limitCount: 50,
    });

    let results = nearby;
    if (filters.query?.trim()) {
      results = results.filter((u) => matchesPlayerQuery(filters.query!, u));
    }
    return results;
  },

  /**
   * Get trending events sorted by trend score.
   */
  async getTrending(limitCount = 10): Promise<TrendingEvent[]> {
    const events = await getEvents({ limitCount: 50 });
    return events
      .map((e) => ({
        event: e,
        trendScore: calcTrendScore(e),
        reason: trendReason(e),
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limitCount);
  },

  /**
   * Get sport suggestions based on query prefix.
   */
  getSportSuggestions(query: string): typeof SPORTS {
    if (!query.trim()) return SPORTS;
    const q = query.toLowerCase();
    return SPORTS.filter(
      (s) => s.name.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)
    );
  },

  /**
   * AI-compatible: score compatibility between two users (0-100).
   */
  scorePlayerCompatibility(viewer: Partial<User>, player: Partial<User>): number {
    let score = 40;
    const shared = (viewer.sports || []).filter((s) =>
      (player.sports || []).map((x) => x.toLowerCase()).includes(s.toLowerCase())
    );
    score += shared.length * 15;
    if (viewer.skillLevel && player.skillLevel && viewer.skillLevel === player.skillLevel) {
      score += 15;
    }
    const ratingDiff = Math.abs((viewer.rating || 3) - (player.rating || 3));
    if (ratingDiff < 0.5) score += 10;
    if (player.isOnline) score += 5;
    return Math.min(100, score);
  },
};
