import type { FirebaseError } from 'firebase/app';

export function mapFirebaseAuthError(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Use a stronger password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export function getDisplayNameFromEmail(email: string): string {
  return email
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'User';
}
