import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../constants';
import { locationService } from '../locationService';
import type { User } from '../../utils/types';
import type { AIChatMessage, AssistantContext } from './aiTypes';
import { aiClient } from './aiClient';
import { assistantPrompts } from './assistantPrompts';
import { eventSuggestionService } from './eventSuggestionService';
import { recommendationService } from './recommendationService';

export const chatService = {
  async getOrCreateAssistantChat(userId: string): Promise<string> {
    const chatsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.AI_CHATS),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(chatsQuery);
    if (!snapshot.empty) return snapshot.docs[0].id;

    const ref = doc(collection(db, FIRESTORE_COLLECTIONS.AI_CHATS));
    await setDoc(ref, {
      chatId: ref.id,
      userId,
      title: 'SportsBuddy AI',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  subscribeToMessages(chatId: string, callback: (messages: AIChatMessage[]) => void) {
    const messagesQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.AI_CHATS, chatId, FIRESTORE_COLLECTIONS.AI_MESSAGES),
      orderBy('createdAt', 'asc'),
      limit(80)
    );
    return onSnapshot(messagesQuery, (snapshot) => {
      callback(snapshot.docs.map((messageDoc) => normalizeAIMessage(messageDoc.id, chatId, messageDoc.data())));
    });
  },

  async sendAssistantMessage(input: {
    chatId: string;
    user: Partial<User>;
    content: string;
    history: AIChatMessage[];
  }): Promise<AIChatMessage> {
    const userMessageRef = await addDoc(
      collection(db, FIRESTORE_COLLECTIONS.AI_CHATS, input.chatId, FIRESTORE_COLLECTIONS.AI_MESSAGES),
      {
        chatId: input.chatId,
        role: 'user',
        content: input.content,
        createdAt: serverTimestamp(),
        metadata: {
          intent: assistantPrompts.detectIntent(input.content),
        },
      }
    );

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.AI_CHATS, input.chatId), {
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const context = await this.buildAssistantContext(input.user);
    const systemPrompt = assistantPrompts.buildSystemPrompt(context);
    const history = [
      ...input.history.slice(-10),
      {
        id: userMessageRef.id,
        chatId: input.chatId,
        role: 'user' as const,
        content: input.content,
        createdAt: new Date(),
      },
    ];

    try {
      const response = await aiClient.generateAssistantResponse({
        systemPrompt,
        messages: history,
      });
      const assistantRef = await addDoc(
        collection(db, FIRESTORE_COLLECTIONS.AI_CHATS, input.chatId, FIRESTORE_COLLECTIONS.AI_MESSAGES),
        {
          chatId: input.chatId,
          role: 'assistant',
          content: response.content,
          createdAt: serverTimestamp(),
          metadata: {
            intent: assistantPrompts.detectIntent(input.content),
            provider: response.provider,
            model: response.model,
            recommendationCount: context.nearbyEvents.length + context.teammateRecommendations.length,
          },
        }
      );

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.AI_CHATS, input.chatId), {
        title: input.content.slice(0, 48) || 'SportsBuddy AI',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return {
        id: assistantRef.id,
        chatId: input.chatId,
        role: 'assistant',
        content: response.content,
        createdAt: new Date(),
        status: 'sent',
        metadata: {
          provider: response.provider,
          model: response.model,
        },
      };
    } catch {
      const fallback = 'I had trouble reaching the AI service. I can still help with sports, events, teammates, and training if you try again in a moment.';
      const assistantRef = await addDoc(
        collection(db, FIRESTORE_COLLECTIONS.AI_CHATS, input.chatId, FIRESTORE_COLLECTIONS.AI_MESSAGES),
        {
          chatId: input.chatId,
          role: 'assistant',
          content: fallback,
          createdAt: serverTimestamp(),
          metadata: {
            intent: 'error_fallback',
            provider: 'local',
            model: 'local-fallback',
          },
        }
      );
      return {
        id: assistantRef.id,
        chatId: input.chatId,
        role: 'assistant',
        content: fallback,
        createdAt: new Date(),
        status: 'failed',
      };
    }
  },

  async buildAssistantContext(user: Partial<User>): Promise<AssistantContext> {
    const location = await locationService.getCurrentLocation();
    const [nearbyEvents, teammateRecommendations, sportSuggestions, eventSuggestion] = await Promise.all([
      user.uid ? eventSuggestionService.getRecommendedEvents(user) : Promise.resolve([]),
      user.uid ? recommendationService.getTeammateRecommendations(user) : Promise.resolve([]),
      buildSportSuggestions(user),
      eventSuggestionService.getEventSuggestion(user),
    ]);

    return {
      user,
      locationSummary: location
        ? `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
        : undefined,
      nearbyEvents,
      teammateRecommendations,
      sportSuggestions,
      eventSuggestion,
    };
  },
};

function normalizeAIMessage(id: string, chatId: string, data: Record<string, unknown>): AIChatMessage {
  return {
    id,
    chatId,
    role: (data.role as AIChatMessage['role']) || 'assistant',
    content: String(data.content || ''),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    status: 'sent',
    metadata: data.metadata as AIChatMessage['metadata'],
  };
}

async function buildSportSuggestions(user: Partial<User>): Promise<string[]> {
  const profileSports = user.sports || [];
  if (profileSports.length >= 3) return profileSports.slice(0, 5);
  return [...new Set([...profileSports, 'Basketball', 'Tennis', 'Running', 'Soccer'])].slice(0, 5);
}
