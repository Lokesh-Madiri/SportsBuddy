// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  profileImage?: string;
  imageURL?: string;
  username?: string;
  bio?: string;
  sportsPersonality?: string;
  sports: string[];
  favoriteSport?: string;
  skillLevels?: Record<string, SkillLevel>;
  skillLevel?: string;
  availability?: UserAvailability;
  location?: UserLocation;
  stats: UserStats;
  achievements: Achievement[];
  badges?: AchievementBadge[];
  completedMatches?: MatchHistoryItem[];
  rating: number;
  reviewCount: number;
  averageRating?: number;
  sportsmanshipScore?: number;
  reliabilityScore?: number;
  totalMatches?: number;
  totalReviews?: number;
  profileCompleted?: boolean;
  reputation?: ReputationMetrics;
  createdAt: Date;
  updatedAt: Date;
  isOnline?: boolean;
  fcmToken?: string;
}

export type ReviewRole = 'teammate' | 'organizer';

export interface UserReview {
  id: string;
  matchId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  revieweeId: string;
  revieweeName: string;
  role: ReviewRole;
  rating: number;
  sportsmanship: number;
  punctuality: number;
  comment: string;
  tags: string[];
  createdAt: Date;
  aiSignals?: ReputationAISignals;
}

export interface UserRatingAggregate {
  userId: string;
  averageRating: number;
  totalReviews: number;
  teammateAverage: number;
  teammateReviewCount: number;
  organizerAverage: number;
  organizerReviewCount: number;
  sportsmanshipAverage: number;
  lastReviewAt?: Date;
  updatedAt: Date;
}

export interface ReputationMetrics {
  userId: string;
  averageRating: number;
  reviewCount: number;
  sportsmanshipScore: number;
  reliabilityScore: number;
  punctualityScore: number;
  attendanceRate: number;
  cancellationRate: number;
  communityScore: number;
  trustLevel: ReputationLevel;
  trustedBadge: boolean;
  attendance: {
    attended: number;
    missed: number;
    late: number;
    cancellations: number;
    totalTracked: number;
  };
  aiSignals: ReputationAISignals;
  updatedAt: Date;
}

export type ReputationLevel = 'new' | 'rising' | 'trusted' | 'elite';

export interface ReputationAISignals {
  trustScoreReady: boolean;
  behaviorVectorVersion: string;
  lastAnalyzedAt?: Date;
  flags: string[];
}

export type AttendanceStatus = 'attended' | 'missed' | 'late' | 'cancelled';

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

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';

export interface UserAvailability {
  availableDays: string[];
  availableTimeSlots: string[];
  weekendOnly?: boolean;
  preferredTimes?: string[];
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: Date;
}

export interface MatchHistoryItem {
  id: string;
  sport: string;
  title: string;
  date: Date;
  result?: 'Won' | 'Lost' | 'Draw' | 'Played';
  score?: string;
  attendanceStatus?: AttendanceStatus;
  organizerName?: string;
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
  distanceMiles?: number | null;
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

// ─── Leaderboard Types ────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  sport?: string;
  gamesPlayed: number;
  rating: number;
  sportsmanshipScore: number;
  reliabilityScore: number;
  communityScore: number;
  trustedBadge: boolean;
  trustLevel: ReputationLevel;
  rank: number;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
export interface TypingUser {
  uid: string;
  displayName: string;
  updatedAt: number; // epoch ms — for auto-cleanup
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
  CreateMatch: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  MatchDetails: { eventId: string };
  PostMatchRating: { eventId: string };
  CreateGame: undefined;
  EditGame: { eventId: string };
  ChatScreen: { chatId: string; eventTitle: string };
  AllEvents: undefined;
  AllPlayers: undefined;
  Leaderboard: { sport?: string };
  Notifications: undefined;
};

export type DiscoverStackParamList = {
  DiscoverScreen: undefined;
  MatchDetails: { eventId: string };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatScreen: { chatId: string; eventTitle: string };
  AIChat: undefined;
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Leaderboard: { sport?: string };
};
