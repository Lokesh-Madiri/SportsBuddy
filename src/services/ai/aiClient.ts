import { AI_CONFIG } from '../../constants';
import type { AIProviderRequest } from './aiTypes';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export const aiClient = {
  getProvider(): 'openai' | 'openrouter' | 'local' {
    if (AI_CONFIG.PROVIDER === 'openrouter' && AI_CONFIG.OPENROUTER_API_KEY) return 'openrouter';
    if (AI_CONFIG.OPENAI_API_KEY) return 'openai';
    if (AI_CONFIG.OPENROUTER_API_KEY) return 'openrouter';
    return 'local';
  },

  async generateAssistantResponse(request: AIProviderRequest): Promise<{
    content: string;
    provider: 'openai' | 'openrouter' | 'local';
    model: string;
  }> {
    const provider = this.getProvider();
    if (provider === 'local') {
      return {
        content: buildLocalFallback(request.messages.at(-1)?.content || ''),
        provider,
        model: 'local-fallback',
      };
    }

    const apiKey = provider === 'openrouter'
      ? AI_CONFIG.OPENROUTER_API_KEY
      : AI_CONFIG.OPENAI_API_KEY;
    const url = provider === 'openrouter' ? OPENROUTER_CHAT_URL : OPENAI_CHAT_URL;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter'
          ? {
              'HTTP-Referer': 'https://sportsbuddy.app',
              'X-Title': 'SportsBuddy',
            }
          : {}),
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [
          { role: 'system', content: request.systemPrompt },
          ...request.messages.map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content,
          })),
        ],
        max_tokens: request.maxTokens || AI_CONFIG.MAX_TOKENS,
        temperature: request.temperature ?? 0.45,
      }),
    });

    const json = (await response.json()) as ChatCompletionResponse;
    if (!response.ok) {
      throw new Error(json.error?.message || 'AI provider request failed');
    }

    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('AI returned an empty response');

    return {
      content,
      provider,
      model: AI_CONFIG.MODEL,
    };
  },
};

function buildLocalFallback(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('teammate')) {
    return 'I can help match teammates by sport, skill, reliability, sportsmanship, availability, and distance. Add your sports and availability in your profile for better matches.';
  }
  if (lower.includes('event') || lower.includes('match')) {
    return 'I can recommend nearby matches from SportsBuddy data. Try asking for a sport, time, and skill level, like "find basketball tonight".';
  }
  if (lower.includes('train')) {
    return 'Try a balanced session: 10 minutes warmup, 20 minutes skill drills, 15 minutes game-speed reps, and 5 minutes cooldown. Tell me your sport for a tailored plan.';
  }
  return 'I can help with sports events, teammates, training tips, rules, and scheduling. Ask me what you want to play or improve today.';
}
