import { create } from 'zustand';
import type { Chat, Message } from '../utils/types';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  typingUsers: Record<string, string[]>;

  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  setLoading: (loading: boolean) => void;
  setTypingUser: (chatId: string, userId: string, isTyping: boolean) => void;
  getTotalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  isLoading: false,
  typingUsers: {},

  setChats: (chats) => set({ chats }),

  setActiveChat: (activeChat) => set({ activeChat }),

  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    })),

  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setTypingUser: (chatId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return {
        typingUsers: { ...state.typingUsers, [chatId]: updated },
      };
    }),

  getTotalUnread: () => {
    const { chats } = get();
    return chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  },
}));
