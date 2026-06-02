import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import type {
  AchievementBadge,
  MatchHistoryItem,
  ReputationMetrics,
  User,
  UserAvailability,
} from '../utils/types';

export type ProfileUpdateInput = Partial<Pick<
  User,
  | 'displayName'
  | 'username'
  | 'bio'
  | 'sportsPersonality'
  | 'sports'
  | 'favoriteSport'
  | 'skillLevel'
  | 'skillLevels'
  | 'availability'
  | 'profileImage'
  | 'imageURL'
  | 'photoURL'
  | 'badges'
>>;

export const profileService = {
  async uploadProfileImage(
    userId: string,
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = getImageExtension(uri);
    const imageRef = ref(storage, `profileImages/${userId}/avatar.${extension}`);
    const uploadTask = uploadBytesResumable(imageRef, blob, {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress?.(progress);
        },
        reject,
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  },

  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...input,
      updatedAt: serverTimestamp(),
    });
  },

  async updateProfileImage(userId: string, imageURL: string): Promise<void> {
    await this.updateProfile(userId, {
      profileImage: imageURL,
      imageURL,
      photoURL: imageURL,
    });
  },

  async getMatchHistory(userId: string, count = 10): Promise<MatchHistoryItem[]> {
    const eventsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.EVENTS),
      where('status', '==', 'completed'),
      orderBy('date', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(eventsQuery);

    return snapshot.docs
      .map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() }) as any)
      .filter((event) => Array.isArray(event.participants)
        && event.participants.some((participant: { uid?: string }) => participant.uid === userId))
      .map((event): MatchHistoryItem => ({
        id: event.id,
        sport: event.sport || 'Sport',
        title: event.title || 'Completed match',
        date: event.date?.toDate?.() || new Date(),
        result: event.result || 'Played',
        score: event.score,
        attendanceStatus: event.attendanceStatus || 'attended',
        organizerName: event.organizerName,
      }));
  },
};

export function calculateAchievementBadges(input: Partial<User> & {
  reputation?: ReputationMetrics;
}): AchievementBadge[] {
  const reputation = input.reputation;
  const reviewCount = reputation?.reviewCount ?? input.reviewCount ?? input.totalReviews ?? 0;
  const rating = reputation?.averageRating ?? input.rating ?? input.averageRating ?? 0;
  const reliability = reputation?.reliabilityScore ?? input.reliabilityScore ?? 100;
  const sportsmanship = reputation?.sportsmanshipScore ?? input.sportsmanshipScore ?? 100;
  const gamesPlayed = input.stats?.gamesPlayed ?? input.totalMatches ?? 0;

  return [
    {
      id: 'trusted_player',
      name: 'Trusted Player',
      description: 'Strong community score and enough peer feedback.',
      icon: 'shield-checkmark-outline',
      earned: Boolean(reputation?.trustedBadge || (reviewCount >= 5 && rating >= 4.5)),
    },
    {
      id: 'mvp_player',
      name: 'MVP Player',
      description: 'High rating across repeated games.',
      icon: 'star-outline',
      earned: rating >= 4.8 && reviewCount >= 8,
    },
    {
      id: 'team_player',
      name: 'Team Player',
      description: 'Excellent sportsmanship signal.',
      icon: 'people-outline',
      earned: sportsmanship >= 85 && reviewCount >= 3,
    },
    {
      id: 'reliable_athlete',
      name: 'Reliable Athlete',
      description: 'Shows up consistently and on time.',
      icon: 'time-outline',
      earned: reliability >= 85 && gamesPlayed >= 3,
    },
    {
      id: 'community_favorite',
      name: 'Community Favorite',
      description: 'Active, reviewed, and highly rated.',
      icon: 'heart-outline',
      earned: gamesPlayed >= 20 && reviewCount >= 10 && rating >= 4.6,
    },
  ];
}

export function normalizeAvailability(availability?: UserAvailability): UserAvailability {
  return {
    availableDays: availability?.availableDays || [],
    availableTimeSlots: availability?.availableTimeSlots || [],
    weekendOnly: availability?.weekendOnly || false,
    preferredTimes: availability?.preferredTimes || [],
  };
}

function getImageExtension(uri: string): 'jpg' | 'png' | 'webp' {
  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'png';
  if (cleanUri.endsWith('.webp')) return 'webp';
  return 'jpg';
}
