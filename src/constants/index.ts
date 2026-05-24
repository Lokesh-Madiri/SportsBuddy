export const APP_NAME = 'SportsBuddy';
export const APP_VERSION = '1.0.0';

export const SPORTS = [
  { id: 'basketball', name: 'Basketball', icon: '🏀', color: '#f97316' },
  { id: 'soccer', name: 'Soccer', icon: '⚽', color: '#22c55e' },
  { id: 'tennis', name: 'Tennis', icon: '🎾', color: '#eab308' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐', color: '#3b82f6' },
  { id: 'running', name: 'Running', icon: '🏃', color: '#ef4444' },
  { id: 'swimming', name: 'Swimming', icon: '🏊', color: '#06b6d4' },
  { id: 'golf', name: 'Golf', icon: '⛳', color: '#84cc16' },
  { id: 'baseball', name: 'Baseball', icon: '⚾', color: '#f59e0b' },
  { id: 'cycling', name: 'Cycling', icon: '🚴', color: '#8b5cf6' },
  { id: 'badminton', name: 'Badminton', icon: '🏸', color: '#ec4899' },
];

export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro'];

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'sportsEvents',
  CHATS: 'chats',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  REVIEWS: 'reviews',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@sportsbuddy_auth_token',
  USER_DATA: '@sportsbuddy_user_data',
  ONBOARDING_DONE: '@sportsbuddy_onboarding',
};

export const AI_CONFIG = {
  // OpenAI integration point - replace with actual key when ready
  API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 500,
};

export const PAGINATION = {
  EVENTS_PER_PAGE: 10,
  MESSAGES_PER_PAGE: 30,
  PLAYERS_PER_PAGE: 20,
};
