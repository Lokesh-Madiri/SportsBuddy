// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  bio?: string;
  sports: string[];
  skillLevel?: string;
  location?: UserLocation;
  stats: UserStats;
  achievements: Achievement[];
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  isOnline?: boolean;
  fcmToken?: string;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  teammates: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
}

// ─── Event Types ──────────────────────────────────────────────────────────────
export interface SportEvent {
  id: string;
  title: string;
  sport: string;
  sportIcon?: string;
  description?: string;
  location: EventLocation;
  date: Date;
  time: string;
  endTime?: string;
  skillLevel: string;
  maxPlayers: number;
  currentPlayers: number;
  participants: EventParticipant[];
  organizerId: string;
  organizerName: string;
  organizerAvatar?: string;
  organizerRating?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  chatId?: string;
  distance?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventParticipant {
  uid: string;
  displayName: string;
  avatar?: string;
  confirmed: boolean;
  joinedAt: Date;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────
export interface Chat {
  id: string;
  eventId: string;
  eventTitle: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  type: 'text' | 'image' | 'system';
  imageUrl?: string;
  createdAt: Date;
  readBy: string[];
}

// ─── Notification Types ───────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'event_reminder' | 'join_alert' | 'chat_message' | 'system';
  data?: Record<string, string>;
  read: boolean;
  createdAt: Date;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────
export interface AIRecommendation {
  userId: string;
  displayName: string;
  avatar?: string;
  sport: string;
  rating: number;
  matchCount: number;
  compatibilityScore: number;
  reason: string;
}

export interface AIEventSuggestion {
  sport: string;
  suggestedTime: string;
  suggestedDay: string;
  reason: string;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  MatchDetails: { eventId: string };
  CreateGame: undefined;
  ChatScreen: { chatId: string; eventTitle: string };
  AllEvents: undefined;
  AllPlayers: undefined;
};

export type DiscoverStackParamList = {
  DiscoverScreen: undefined;
  MatchDetails: { eventId: string };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatScreen: { chatId: string; eventTitle: string };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  EditProfile: undefined;
  Settings: undefined;
};
