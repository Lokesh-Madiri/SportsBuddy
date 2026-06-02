import type { SportEvent, User } from '../../utils/types';
import type { CompatibilityResult, EventRecommendation, ScoreFactor, UserBehaviorProfile } from './aiTypes';
import {
  clamp,
  eventDistanceMiles,
  getConfidence,
  getDayName,
  mergeBehaviorWithUserSports,
  parseHour,
  sharedSports,
} from './aiHelpers';
import { promptService } from './promptService';

const SKILL_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  pro: 4,
};

export const scoringEngine = {
  scoreCompatibility(
    user: Partial<User>,
    teammate: Partial<User>,
    behavior?: UserBehaviorProfile | null
  ): CompatibilityResult {
    const sports = sharedSports(user, teammate);
    const distance = user.location && teammate.location ? distanceBetweenUsers(user, teammate) : undefined;

    const factors: ScoreFactor[] = [
      {
        key: 'sports',
        label: 'Shared sports',
        score: sports.length > 0 ? clamp(55 + sports.length * 15) : 20,
        weight: 0.28,
      },
      {
        key: 'skill',
        label: 'Skill similarity',
        score: scoreSkillSimilarity(user.skillLevel, teammate.skillLevel),
        weight: 0.18,
      },
      {
        key: 'location',
        label: 'Location proximity',
        score: scoreDistance(distance),
        weight: 0.16,
      },
      {
        key: 'rating',
        label: 'Player rating',
        score: clamp(((teammate.rating || 0) / 5) * 100),
        weight: 0.12,
      },
      {
        key: 'frequency',
        label: 'Play frequency',
        score: scorePlayFrequency(teammate.stats?.gamesPlayed || 0),
        weight: 0.1,
      },
      {
        key: 'timing',
        label: 'Preferred timing',
        score: behavior?.preferredHours.length ? 68 : 50,
        weight: 0.08,
      },
      {
        key: 'reliability',
        label: 'Reliability',
        score: scoreReliability(teammate, behavior),
        weight: 0.08,
      },
    ];

    const percentage = weightedScore(factors);
    return {
      percentage,
      confidence: getConfidence(percentage, factors.filter((factor) => factor.score > 50).length),
      factors,
      sharedSports: sports,
      distanceMiles: distance,
      reason: promptService.buildTeammateExplanation(user, teammate, {
        percentage,
        confidence: getConfidence(percentage, factors.length),
        reason: '',
        factors,
        sharedSports: sports,
        distanceMiles: distance,
      }, behavior),
    };
  },

  scoreEvent(
    user: Partial<User>,
    event: SportEvent,
    behavior?: UserBehaviorProfile | null
  ): EventRecommendation {
    const userSports = mergeBehaviorWithUserSports(user, behavior).map((sport) => sport.toLowerCase());
    const hour = parseHour(event.time);
    const day = getDayName(event.date);
    const distance = eventDistanceMiles(user, event);
    const openRatio = event.maxPlayers > 0 ? 1 - event.currentPlayers / event.maxPlayers : 0;

    const factors: ScoreFactor[] = [
      {
        key: 'sport',
        label: 'Sport interest',
        score: userSports.includes(event.sport.toLowerCase()) ? 95 : 45,
        weight: 0.28,
      },
      {
        key: 'skill',
        label: 'Skill fit',
        score: scoreSkillSimilarity(user.skillLevel, event.skillLevel),
        weight: 0.18,
      },
      {
        key: 'time',
        label: 'Timing fit',
        score: scoreTiming(hour, day, behavior),
        weight: 0.16,
      },
      {
        key: 'distance',
        label: 'Nearby',
        score: scoreDistance(distance),
        weight: 0.14,
      },
      {
        key: 'availability',
        label: 'Open spots',
        score: clamp(openRatio * 100),
        weight: 0.12,
      },
      {
        key: 'host',
        label: 'Host rating',
        score: clamp(((event.organizerRating || 3.5) / 5) * 100),
        weight: 0.06,
      },
      {
        key: 'freshness',
        label: 'Upcoming soon',
        score: scoreUpcomingDate(event.date),
        weight: 0.06,
      },
    ];

    const score = weightedScore(factors);
    return {
      event,
      score,
      confidence: getConfidence(score, factors.filter((factor) => factor.score > 50).length),
      reason: promptService.buildEventExplanation(user, event, behavior),
      factors,
    };
  },
};

function weightedScore(factors: ScoreFactor[]): number {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight
  );
}

function scoreSkillSimilarity(a?: string, b?: string): number {
  if (!a || !b) return 55;
  const aRank = SKILL_RANK[a.toLowerCase()] || 2;
  const bRank = SKILL_RANK[b.toLowerCase()] || 2;
  const diff = Math.abs(aRank - bRank);
  if (diff === 0) return 100;
  if (diff === 1) return 72;
  if (diff === 2) return 42;
  return 25;
}

function scoreDistance(distance?: number): number {
  if (distance === undefined) return 55;
  if (distance <= 3) return 100;
  if (distance <= 10) return 82;
  if (distance <= 25) return 55;
  if (distance <= 50) return 30;
  return 10;
}

function scorePlayFrequency(gamesPlayed: number): number {
  if (gamesPlayed >= 100) return 96;
  if (gamesPlayed >= 40) return 82;
  if (gamesPlayed >= 10) return 64;
  if (gamesPlayed > 0) return 48;
  return 35;
}

function scoreReliability(user: Partial<User>, behavior?: UserBehaviorProfile | null): number {
  if (user.reputation?.reliabilityScore !== undefined) {
    return clamp(user.reputation.reliabilityScore);
  }

  const winRate = user.stats?.winRate || 0;
  const ratingScore = ((user.rating || 0) / 5) * 100;
  const behaviorScore = behavior?.reliabilityScore ?? 65;
  return clamp(ratingScore * 0.45 + winRate * 0.2 + behaviorScore * 0.35);
}

function scoreTiming(hour?: number, day?: string, behavior?: UserBehaviorProfile | null): number {
  if (!behavior) return 55;
  let score = 45;
  if (hour !== undefined && behavior.preferredHours.some((preferred) => Math.abs(preferred - hour) <= 2)) {
    score += 35;
  }
  if (day && behavior.preferredDays.includes(day)) {
    score += 20;
  }
  return clamp(score);
}

function scoreUpcomingDate(date: Date): number {
  const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 0;
  if (diffDays <= 2) return 90;
  if (diffDays <= 7) return 75;
  if (diffDays <= 21) return 55;
  return 35;
}

function distanceBetweenUsers(user: Partial<User>, teammate: Partial<User>): number | undefined {
  if (!user.location || !teammate.location) return undefined;
  const lat1 = user.location.latitude;
  const lon1 = user.location.longitude;
  const lat2 = teammate.location.latitude;
  const lon2 = teammate.location.longitude;
  const radiusMiles = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
