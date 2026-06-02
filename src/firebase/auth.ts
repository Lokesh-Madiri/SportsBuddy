import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import type { User } from '../utils/types';

// ─── Get User Profile ─────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<User | null> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { uid, ...docSnap.data() } as User;
  }
  return null;
}

// ─── Create User Profile (idempotent) ────────────────────────────────────────
// Called after Firebase Auth sign-up/sign-in to bootstrap the Firestore user document.
// Safe to call multiple times — will not overwrite an existing document.
export async function createUserProfileIfMissing(
  uid: string,
  displayName: string,
  email: string
): Promise<User> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const existing = await getDoc(docRef);

  if (existing.exists()) {
    return { uid, ...existing.data() } as User;
  }

  const newProfile: Partial<User> = {
    uid,
    email,
    displayName,
    sports: [],
    skillLevels: {},
    favoriteSport: '',
    bio: '',
    sportsPersonality: '',
    profileImage: '',
    imageURL: '',
    availability: {
      availableDays: [],
      availableTimeSlots: [],
      weekendOnly: false,
      preferredTimes: [],
    },
    badges: [],
    completedMatches: [],
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      teammates: 0,
    },
    achievements: [
      { id: 'first_game', name: 'First Game', icon: '🎯', earned: false },
      { id: 'team_player', name: 'Team Player', icon: '🤝', earned: false },
      { id: 'mvp', name: 'MVP', icon: '⭐', earned: false },
    ],
    rating: 0,
    reviewCount: 0,
    averageRating: 0,
    sportsmanshipScore: 100,
    reliabilityScore: 100,
    totalMatches: 0,
    totalReviews: 0,
    profileCompleted: false,
  };

  await setDoc(docRef, {
    ...newProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...newProfile,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}
