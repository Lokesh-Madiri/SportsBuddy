import { SPORTS } from '../../constants';
import type { AIRecommendation, SportEvent, User } from '../../utils/types';
import type {
  BehaviorSignal,
  EventRecommendation,
  PersonalizedHomeFeed,
  TeammateRecommendation,
} from './aiTypes';
import { compatibilityService } from './compatibilityService';
import { eventSuggestionService } from './eventSuggestionService';
import { recommendationService } from './recommendationService';
import { userBehaviorService } from './userBehaviorService';
import { promptService } from './promptService';
import { chatService } from './chatService';
import { mergeBehaviorWithUserSports, unique } from './aiHelpers';

export const aiService = {
  async getTeammateRecommendations(
    user: Partial<User>,
    availablePlayers?: Partial<User>[]
  ): Promise<TeammateRecommendation[]> {
    return recommendationService.getTeammateRecommendations(user, availablePlayers);
  },

  async getEventSuggestion(user: Partial<User>, nearbyEvents?: Partial<SportEvent>[]) {
    return eventSuggestionService.getEventSuggestion(user, nearbyEvents);
  },

  async getRecommendedEvents(
    user: Partial<User>,
    nearbyEvents?: Partial<SportEvent>[]
  ): Promise<EventRecommendation[]> {
    return eventSuggestionService.getRecommendedEvents(user, nearbyEvents);
  },

  async getSportRecommendations(user: Partial<User>): Promise<string[]> {
    const behavior = user.uid
      ? await userBehaviorService.getUserBehaviorProfile(user.uid)
      : null;

    const profileSports = mergeBehaviorWithUserSports(user, behavior);
    const fallbackSports = SPORTS.map((sport) => sport.name);
    const suggestions = unique([...profileSports, ...fallbackSports]).slice(0, 5);

    if (!suggestions.length) return ['Basketball', 'Tennis', 'Soccer'];

    const prompt = promptService.buildSportsSuggestionPrompt(user, behavior);
    const aiText = await promptService.generateShortExplanation(prompt, suggestions.join(', '));
    return aiText
      .split(',')
      .map((sport) => sport.trim())
      .filter(Boolean)
      .slice(0, 5);
  },

  calculateCompatibility(user1: Partial<User>, user2: Partial<User>): number {
    return compatibilityService.calculateCompatibility(user1, user2);
  },

  getCompatibilityDetails(user1: Partial<User>, user2: Partial<User>) {
    return compatibilityService.getCompatibilityDetails(user1, user2);
  },

  async getPersonalizedHomeFeed(user: Partial<User>): Promise<PersonalizedHomeFeed> {
    const [recommendedTeammates, eventRecommendations, suggestedSports] = await Promise.all([
      this.getTeammateRecommendations(user),
      this.getRecommendedEvents(user),
      this.getSportRecommendations(user),
    ]);

    return {
      recommendedTeammates,
      trendingMatches: eventRecommendations
        .filter((item) => item.event.currentPlayers >= Math.max(2, item.event.maxPlayers * 0.5))
        .slice(0, 5),
      nearbyGames: eventRecommendations
        .filter((item) => item.factors.some((factor) => factor.key === 'distance' && factor.score >= 55))
        .slice(0, 5),
      suggestedSports,
      curatedEvents: eventRecommendations.slice(0, 8),
      generatedAt: new Date(),
    };
  },

  async trackUserBehavior(signal: BehaviorSignal): Promise<void> {
    await userBehaviorService.trackBehaviorEvent(signal);
    recommendationService.clearCache(signal.userId);
    eventSuggestionService.clearCache(signal.userId);
  },

  subscribeToRecommendations(
    user: Partial<User>,
    callback: (recommendations: AIRecommendation[]) => void
  ) {
    if (!user.uid) {
      callback([]);
      return () => undefined;
    }

    return recommendationService.subscribeToStoredRecommendations(user.uid, callback);
  },

  subscribeToEventRecommendations: eventSuggestionService.subscribeToEventRecommendations,
  chat: chatService,
};

export * from './aiTypes';
export { compatibilityService } from './compatibilityService';
export { eventSuggestionService } from './eventSuggestionService';
export { recommendationService } from './recommendationService';
export { scoringEngine } from './scoringEngine';
export { userBehaviorService } from './userBehaviorService';
export { promptService } from './promptService';
export { chatService } from './chatService';
export { aiClient } from './aiClient';
export { assistantPrompts } from './assistantPrompts';
export { compatibilityEngine } from './compatibilityEngine';
