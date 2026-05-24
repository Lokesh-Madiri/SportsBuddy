import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ─── Firebase Configuration ───────────────────────────────────────────────────
// Replace these values with your actual Firebase project config
// from https://console.firebase.google.com
// Copy .env.example to .env and fill in your values
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your_firebase_api_key_here',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your_firebase_auth_domain_here',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your_firebase_project_id_here',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your_firebase_storage_bucket_here',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your_firebase_messaging_sender_id_here',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your_firebase_app_id_here',
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
