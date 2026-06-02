import { AI_CONFIG } from '../../constants';
import type { SportEvent, User } from '../../utils/types';
import type { CompatibilityResult, EventRecommendation, UserBehaviorProfile } from './aiTypes';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export const promptService = {
  buildTeammateExplanation(
    user: Partial<User>,
    teammate: Partial<User>,
    compatibility: CompatibilityResult,
    behavior?: UserBehaviorProfile | null
  ): string {
    const reasons: string[] = [];
    if (compatibility.sharedSports.length > 0) {
      reasons.push(`shared interest in ${compatibility.sharedSports.slice(0, 2).join(' and ')}`);
    }
    if (user.skillLevel && teammate.skillLevel && user.skillLevel === teammate.skillLevel) {
      reasons.push('similar skill level');
    }
    if (compatibility.distanceMiles !== undefined && compatibility.distanceMiles <= 10) {
      reasons.push('nearby location');
    }
    if ((teammate.rating || 0) >= 4.5) {
      reasons.push('strong player rating');
    }
    if (behavior?.preferredHours.length) {
      reasons.push('matching activity patterns');
    }

    return reasons.length
      ? `Matched due to ${joinReasonParts(reasons)}.`
      : 'Matched because their profile complements your sports activity.';
  },

  buildEventExplanation(
    user: Partial<User>,
    event: Partial<SportEvent>,
    behavior?: UserBehaviorProfile | null
  ): string {
    const sport = event.sport || 'this sport';
    const day = event.date?.toLocaleDateString('en-US', { weekday: 'long' });
    const reasons: string[] = [];

    if ((user.sports || []).includes(sport) || behavior?.mostPlayedSports.includes(sport)) {
      reasons.push(`you often play ${sport}`);
    }
    if (event.skillLevel && event.skillLevel === user.skillLevel) {
      reasons.push('it matches your skill level');
    }
    if (day && behavior?.preferredDays.includes(day)) {
      reasons.push(`you are active on ${day}s`);
    }
    if (event.time && behavior?.preferredHours.includes(Number(event.time))) {
      reasons.push('it fits your preferred time');
    }

    return reasons.length
      ? `Recommended because ${joinReasonParts(reasons)}.`
      : `Recommended as a relevant upcoming ${sport} match.`;
  },

  buildSportsSuggestionPrompt(user: Partial<User>, behavior?: UserBehaviorProfile | null): string {
    return [
      'Suggest sports for a user in a sports matchmaking app.',
      `Sports: ${(user.sports || []).join(', ') || 'unknown'}`,
      `Skill: ${user.skillLevel || 'unknown'}`,
      `Behavior sports: ${(behavior?.mostPlayedSports || []).join(', ') || 'unknown'}`,
      'Return only a comma separated list of sport names.',
    ].join('\n');
  },

  async generateShortExplanation(prompt: string, fallback: string): Promise<string> {
    if (!AI_CONFIG.OPENAI_API_KEY) return fallback;

    try {
      const response = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AI_CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content:
                'Write concise sports matchmaking explanations. No markdown. Maximum 18 words.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 60,
          temperature: 0.4,
        }),
      });

      if (!response.ok) return fallback;
      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return json.choices?.[0]?.message?.content?.trim() || fallback;
    } catch {
      return fallback;
    }
  },

  summarizeFeedContext(events: EventRecommendation[]): string {
    const top = events.slice(0, 3).map(({ event }) => `${event.sport}: ${event.title}`);
    return top.length ? top.join('; ') : 'No high confidence events yet';
  },
};

function joinReasonParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] || '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}
