import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUsers } from '../../firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../constants';
import type { User } from '../../utils/types';
import type { TeammateRecommendation } from './aiTypes';
import { getCached, setCached } from './aiHelpers';
import { scoringEngine } from './scoringEngine';
import { userBehaviorService } from './userBehaviorService';

const CACHE_TTL_MS = 3 * 60 * 1000;
const recommendationCache = new Map<string, { data: TeammateRecommendation[]; expiresAt: number }>();

// Strip undefined values from an object before writing to Firestore
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const recommendationService = {
  async getTeammateRecommendations(
    user: Partial<User>,
    availablePlayers?: Partial<User>[],
    limitCount = 10
  ): Promise<TeammateRecommendation[]> {
    if (!user.uid) return [];

    const cacheKey = `teammates:${user.uid}:${availablePlayers?.length || 'firestore'}:${limitCount}`;
    const cached = getCached(recommendationCache, cacheKey);
    if (cached) return cached;

    const [behavior, candidates] = await Promise.all([
      userBehaviorService.getUserBehaviorProfile(user.uid),
      availablePlayers ? Promise.resolve(availablePlayers) : getUsers(50),
    ]);

    const recommendations = candidates
      .filter((candidate) => candidate.uid && candidate.uid !== user.uid)
      .map((candidate) => {
        const compatibility = scoringEngine.scoreCompatibility(user, candidate, behavior);
        return {
          userId: candidate.uid || '',
          displayName: candidate.displayName || 'Player',
          avatar: candidate.photoURL,
          sport: compatibility.sharedSports[0] || candidate.sports?.[0] || user.sports?.[0] || 'Sports',
          rating: candidate.rating || 0,
          matchCount: candidate.stats?.gamesPlayed || 0,
          compatibilityScore: compatibility.percentage,
          reason: compatibility.reason,
          confidence: compatibility.confidence,
          factors: compatibility.factors,
          sharedSports: compatibility.sharedSports,
          distanceMiles: compatibility.distanceMiles,
          lastActiveAt: candidate.updatedAt,
        } satisfies TeammateRecommendation;
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limitCount);

    setCached(recommendationCache, cacheKey, recommendations, CACHE_TTL_MS);
    await this.storeRecommendations(user.uid, recommendations);
    return recommendations;
  },

  async storeRecommendations(userId: string, recommendations: TeammateRecommendation[]): Promise<void> {
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.RECOMMENDATIONS, userId),
      {
        userId,
        // Strip any undefined fields — Firestore rejects them
        teammates: recommendations.map((rec) =>
          stripUndefined({
            ...rec,
            avatar: rec.avatar ?? null,
            distanceMiles: rec.distanceMiles ?? null,
            lastActiveAt: rec.lastActiveAt ?? null,
          })
        ),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  subscribeToStoredRecommendations(
    userId: string,
    callback: (recommendations: TeammateRecommendation[]) => void
  ) {
    return onSnapshot(doc(db, FIRESTORE_COLLECTIONS.RECOMMENDATIONS, userId), (snapshot) => {
      const data = snapshot.data();
      callback((data?.teammates || []) as TeammateRecommendation[]);
    });
  },

  clearCache(userId?: string): void {
    for (const key of recommendationCache.keys()) {
      if (!userId || key.includes(`:${userId}:`)) recommendationCache.delete(key);
    }
  },
};
