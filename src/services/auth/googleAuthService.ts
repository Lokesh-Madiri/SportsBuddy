import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { authService } from './authService';
import { sessionService } from './sessionService';

WebBrowser.maybeCompleteAuthSession();

// Only populate client IDs that are actually configured.
// If none are set, useIdTokenAuthRequest returns null and Google sign-in is disabled.
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || undefined;

export const googleAuthConfig = {
  androidClientId,
  iosClientId,
  webClientId,
  expoClientId,
};

// Returns true when at least one platform client ID is configured
export const isGoogleAuthConfigured =
  !!androidClientId || !!iosClientId || !!webClientId;

export function useGoogleAuthRequest() {
  if (!isGoogleAuthConfigured) {
    return [
      null,
      null,
      () => Promise.resolve({ type: 'dismiss' as const }),
    ] as const;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Google.useIdTokenAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
    clientId: expoClientId,
  });
}

export const googleAuthService = {
  async signInWithIdToken(idToken: string) {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const profile = await authService.ensureUserProfile(userCredential.user);
    await sessionService.saveSession(userCredential.user.uid);
    return profile;
  },
};
