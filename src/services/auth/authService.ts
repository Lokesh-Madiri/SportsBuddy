import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../../firebase/config';
import { createUserProfileIfMissing, getUserProfile } from '../../firebase/auth';
import type { User } from '../../utils/types';
import { getDisplayNameFromEmail } from './authHelpers';
import { sessionService } from './sessionService';

export const authService = {
  async registerWithEmail(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password
    );
    await updateProfile(credential.user, { displayName: input.displayName.trim() });
    const profile = await createUserProfileIfMissing(
      credential.user.uid,
      input.displayName.trim(),
      input.email.trim()
    );
    await sessionService.saveSession(credential.user.uid);
    return profile;
  },

  async loginWithEmail(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await this.ensureUserProfile(credential.user);
    await sessionService.saveSession(credential.user.uid);
    return profile;
  },

  async ensureUserProfile(firebaseUser: FirebaseUser): Promise<User> {
    const existing = await getUserProfile(firebaseUser.uid);
    if (existing) return existing;

    return createUserProfileIfMissing(
      firebaseUser.uid,
      firebaseUser.displayName || getDisplayNameFromEmail(firebaseUser.email || ''),
      firebaseUser.email || ''
    );
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async logout(): Promise<void> {
    await signOut(auth);
    await sessionService.clearSession();
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};
