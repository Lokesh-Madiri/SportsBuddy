import type { AIEventSuggestion, AIRecommendation, SportEvent, User } from '../../utils/types';

export type RecommendationConfidence = 'low' | 'medium' | 'high';

export type BehaviorEventType =
  | 'event_view'
  | 'event_join'
  | 'event_leave'
  | 'event_create'
  | 'chat_message'
  | 'teammate_view'
  | 'sport_filter'
  | 'search';

export interface BehaviorSignal {
  type: BehaviorEventType;
  userId: string;
  sport?: string;
  eventId?: string;
  targetUserId?: string;
  timestamp?: Date;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface UserBehaviorProfile {
  userId: string;
  mostPlayedSports: string[];
  sportCounts: Record<string, number>;
  preferredHours: number[];
  preferredDays: string[];
  joinedEventIds: string[];
  frequentlyJoinedEventIds: string[];
  interactionFrequency: number;
  reliabilityScore: number;
  lastActiveAt?: Date;
  updatedAt?: Date;
}

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface CompatibilityResult {
  percentage: number;
  confidence: RecommendationConfidence;
  reason: string;
  factors: ScoreFactor[];
  sharedSports: string[];
  distanceMiles?: number;
}

export interface TeammateRecommendation extends AIRecommendation {
  confidence: RecommendationConfidence;
  factors: ScoreFactor[];
  sharedSports: string[];
  distanceMiles?: number;
  lastActiveAt?: Date;
}

export interface EventRecommendation {
  event: SportEvent;
  score: number;
  confidence: RecommendationConfidence;
  reason: string;
  factors: ScoreFactor[];
}

export interface PersonalizedHomeFeed {
  recommendedTeammates: TeammateRecommendation[];
  trendingMatches: EventRecommendation[];
  nearbyGames: EventRecommendation[];
  suggestedSports: string[];
  curatedEvents: EventRecommendation[];
  generatedAt: Date;
}

export interface RecommendationCacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface EventSuggestionContext {
  user: Partial<User>;
  behavior?: UserBehaviorProfile | null;
  nearbyEvents?: Partial<SportEvent>[];
}

export interface DynamicEventSuggestion extends AIEventSuggestion {
  confidence: RecommendationConfidence;
  source: 'behavior' | 'profile' | 'events' | 'fallback';
}

export type AIChatRole = 'user' | 'assistant' | 'system';

export interface AIChatSession {
  chatId: string;
  userId: string;
  title?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AIChatMessage {
  id: string;
  chatId: string;
  role: AIChatRole;
  content: string;
  createdAt: Date;
  status?: 'sending' | 'sent' | 'failed';
  metadata?: {
    intent?: string;
    provider?: 'openai' | 'openrouter' | 'groq' | 'local';
    model?: string;
    recommendationCount?: number;
  };
}

export interface AIProviderRequest {
  systemPrompt: string;
  messages: Pick<AIChatMessage, 'role' | 'content'>[];
  maxTokens?: number;
  temperature?: number;
}

export interface AssistantContext {
  user: Partial<User>;
  locationSummary?: string;
  nearbyEvents: EventRecommendation[];
  teammateRecommendations: TeammateRecommendation[];
  sportSuggestions: string[];
  eventSuggestion?: DynamicEventSuggestion;
}
