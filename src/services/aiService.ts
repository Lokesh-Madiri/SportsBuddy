/**
 * AI Service - OpenAI Integration Point
 *
 * Currently uses mock/dummy data.
 * To enable real AI: set EXPO_PUBLIC_OPENAI_API_KEY in your .env file
 * and uncomment the OpenAI API calls below.
 */

import type { AIRecommendation, AIEventSuggestion, User, SportEvent } from '../utils/types';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_RECOMMENDATIONS: AIRecommendation[] = [
  {
    userId: 'mock_1',
    displayName: 'Alex Chen',
    sport: 'Basketball',
    rating: 4.9,
    matchCount: 127,
    compatibilityScore: 95,
    reason: 'Similar skill level and preferred game times',
  },
  {
    userId: 'mock_2',
    displayName: 'Sarah Kim',
    sport: 'Tennis',
    rating: 4.8,
    matchCount: 89,
    compatibilityScore: 88,
    reason: 'Plays in your area on weekends',
  },
  {
    userId: 'mock_3',
    displayName: 'Mike Johnson',
    sport: 'Soccer',
    rating: 4.7,
    matchCount: 203,
    compatibilityScore: 82,
    reason: 'Complementary position and play style',
  },
  {
    userId: 'mock_4',
    displayName: 'Emma Davis',
    sport: 'Basketball',
    rating: 4.6,
    matchCount: 64,
    compatibilityScore: 79,
    reason: 'Matched sport preferences and availability',
  },
];

const MOCK_EVENT_SUGGESTION: AIEventSuggestion = {
  sport: 'Basketball',
  suggestedTime: '4:00 PM - 6:00 PM',
  suggestedDay: 'Saturday',
  reason:
    'Based on your preferences, weekend afternoons have the highest player turnout in your area.',
};

// ─── AI Service ───────────────────────────────────────────────────────────────
export const aiService = {
  /**
   * Get AI-powered teammate recommendations
   * Integration point: Replace mock data with OpenAI API call
   */
  async getTeammateRecommendations(
    _user: Partial<User>,
    _availablePlayers?: Partial<User>[]
  ): Promise<AIRecommendation[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // TODO: Replace with actual OpenAI call:
    // const response = await openai.chat.completions.create({
    //   model: AI_CONFIG.MODEL,
    //   messages: [
    //     { role: 'system', content: 'You are a sports teammate matching AI...' },
    //     { role: 'user', content: `Find teammates for: ${JSON.stringify(_user)}` }
    //   ]
    // });

    return MOCK_RECOMMENDATIONS;
  },

  /**
   * Get AI-powered event creation suggestions
   * Integration point: Replace mock data with OpenAI API call
   */
  async getEventSuggestion(
    _user: Partial<User>,
    _nearbyEvents?: Partial<SportEvent>[]
  ): Promise<AIEventSuggestion> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return MOCK_EVENT_SUGGESTION;
  },

  /**
   * Get AI-powered sport recommendations based on user profile
   * Integration point: Replace mock data with OpenAI API call
   */
  async getSportRecommendations(_user: Partial<User>): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return ['Basketball', 'Tennis', 'Soccer'];
  },

  /**
   * Calculate compatibility score between two users
   * Integration point: Replace with ML model or OpenAI
   */
  calculateCompatibility(user1: Partial<User>, user2: Partial<User>): number {
    let score = 50;

    // Shared sports boost
    const sharedSports = (user1.sports || []).filter((s) =>
      (user2.sports || []).includes(s)
    );
    score += sharedSports.length * 15;

    // Similar skill level boost
    if (user1.skillLevel === user2.skillLevel) score += 20;

    // Rating similarity
    const ratingDiff = Math.abs((user1.rating || 0) - (user2.rating || 0));
    if (ratingDiff < 0.5) score += 10;

    return Math.min(100, score);
  },
};
