import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import type { User } from '../utils/types';

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Update display name
  await updateProfile(user, { displayName });

  // Create Firestore user document
  const userDoc: Partial<User> = {
    uid: user.uid,
    email: user.email || email,
    displayName,
    sports: [],
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
  };

  await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid), {
    ...userDoc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ─── Get User Profile ─────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<User | null> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { uid, ...docSnap.data() } as User;
  }
  return null;
}

// ─── Auth State Observer ──────────────────────────────────────────────────────
export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
