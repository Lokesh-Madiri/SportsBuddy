import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// ─── Firebase Configuration ───────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization & crash if keys are missing)
let app;
if (firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} else {
  console.warn('[Firebase] Warning: EXPO_PUBLIC_FIREBASE_API_KEY is missing. Initializing with mock config to prevent crash.');
  app = getApps().length === 0 ? initializeApp({
    apiKey: 'mock-api-key-to-prevent-startup-crash',
    authDomain: 'mock-auth-domain',
    projectId: 'mock-project-id',
    storageBucket: 'mock-storage-bucket',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:1234567890',
  }) : getApp();
}

// Firebase 12 removed getReactNativePersistence from the public bundle.
// We use inMemoryPersistence here — session persistence is handled by our
// own sessionService (AsyncStorage saves the uid and restores auth on launch).
let auth: Auth;
try {
  auth =
    Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, { persistence: inMemoryPersistence });
} catch {
  // Auth already initialized (hot reload) — reuse it
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
