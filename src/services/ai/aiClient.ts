import { AI_CONFIG } from '../../constants';
import type { AIProviderRequest } from './aiTypes';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string } | string;
};

export const aiClient = {
  getProvider(): 'openai' | 'openrouter' | 'groq' | 'local' {
    const configuredProvider = AI_CONFIG.PROVIDER?.toLowerCase();
    
    console.log(`[AIClient Logger] Determining AI Provider. Configured provider in AI_CONFIG: "${AI_CONFIG.PROVIDER}"`);
    console.log(`[AIClient Logger] Keys check - GROQ_API_KEY: ${AI_CONFIG.GROQ_API_KEY ? 'Present' : 'Missing'}, OPENAI_API_KEY: ${AI_CONFIG.OPENAI_API_KEY ? 'Present' : 'Missing'}, OPENROUTER_API_KEY: ${AI_CONFIG.OPENROUTER_API_KEY ? 'Present' : 'Missing'}`);

    if (configuredProvider === 'groq' && AI_CONFIG.GROQ_API_KEY) return 'groq';
    if (configuredProvider === 'openrouter' && AI_CONFIG.OPENROUTER_API_KEY) return 'openrouter';
    if (configuredProvider === 'openai' && AI_CONFIG.OPENAI_API_KEY) return 'openai';

    // Fallbacks if not explicitly configured or configured provider is missing its key
    if (AI_CONFIG.GROQ_API_KEY) {
      console.log(`[AIClient Logger] Falling back to "groq" as GROQ_API_KEY is present.`);
      return 'groq';
    }
    if (AI_CONFIG.OPENAI_API_KEY) {
      console.log(`[AIClient Logger] Falling back to "openai" as OPENAI_API_KEY is present.`);
      return 'openai';
    }
    if (AI_CONFIG.OPENROUTER_API_KEY) {
      console.log(`[AIClient Logger] Falling back to "openrouter" as OPENROUTER_API_KEY is present.`);
      return 'openrouter';
    }

    console.log(`[AIClient Logger] No API keys configured. Returning "local".`);
    return 'local';
  },

  async generateAssistantResponse(request: AIProviderRequest): Promise<{
    content: string;
    provider: 'openai' | 'openrouter' | 'groq' | 'local';
    model: string;
  }> {
    const provider = this.getProvider();
    console.log(`[AIClient Logger] Selected Provider: "${provider}"`);

    if (provider === 'local') {
      const errorMsg = 'AI API keys are not configured. Please add EXPO_PUBLIC_GROQ_API_KEY or EXPO_PUBLIC_OPENAI_API_KEY to your .env file and restart the server.';
      console.error(`[AIClient Logger] [Error] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    let apiKey = '';
    let url = '';
    
    if (provider === 'groq') {
      apiKey = AI_CONFIG.GROQ_API_KEY;
      url = GROQ_CHAT_URL;
    } else if (provider === 'openrouter') {
      apiKey = AI_CONFIG.OPENROUTER_API_KEY;
      url = OPENROUTER_CHAT_URL;
    } else {
      apiKey = AI_CONFIG.OPENAI_API_KEY;
      url = OPENAI_CHAT_URL;
    }

    const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined';
    const requestModel = AI_CONFIG.MODEL;
    
    console.log(`[AIClient Logger] Dispatching HTTP POST request to: ${url}`);
    console.log(`[AIClient Logger] Request Model: ${requestModel}`);
    console.log(`[AIClient Logger] Masked API Key: ${maskedKey}`);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://sportsbuddy.app';
      headers['X-Title'] = 'SportsBuddy';
    }

    const requestBody = {
      model: requestModel,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })),
      ],
      max_tokens: request.maxTokens || AI_CONFIG.MAX_TOKENS,
      temperature: request.temperature ?? 0.45,
    };

    console.log(`[AIClient Logger] Request Payload:`, JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log(`[AIClient Logger] Response Status Code: ${response.status} (${response.statusText})`);

      const responseText = await response.text();
      console.log(`[AIClient Logger] Raw Response Text:`, responseText);

      let json: ChatCompletionResponse;
      try {
        json = JSON.parse(responseText) as ChatCompletionResponse;
      } catch (parseError: any) {
        console.error(`[AIClient Logger] [Error] Failed to parse response JSON:`, parseError);
        throw new Error(`Failed to parse AI provider response: ${parseError.message}. Raw: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        let errorDetails = '';
        if (typeof json.error === 'object' && json.error?.message) {
          errorDetails = json.error.message;
        } else if (typeof json.error === 'string') {
          errorDetails = json.error;
        } else {
          errorDetails = JSON.stringify(json);
        }
        const errorMsg = `AI provider request failed with status ${response.status}: ${errorDetails}`;
        console.error(`[AIClient Logger] [Error] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) {
        const errorMsg = 'AI returned an empty response or invalid format (missing choices[0].message.content)';
        console.error(`[AIClient Logger] [Error] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log(`[AIClient Logger] Successful response received. Content: "${content}"`);

      return {
        content,
        provider,
        model: requestModel,
      };
    } catch (fetchError: any) {
      console.error(`[AIClient Logger] [Fatal Error] Network / HTTP operation failed:`, fetchError);
      throw fetchError;
    }
  },
};
