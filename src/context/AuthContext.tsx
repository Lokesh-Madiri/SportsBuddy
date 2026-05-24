import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { subscribeToAuthState, getUserProfile } from '../firebase/auth';
import { useAuthStore } from '../store/authStore';

interface AuthContextValue {
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isReady: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUser(profile);
          } else {
            // User exists in Auth but not Firestore — create minimal profile
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              sports: [],
              stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, teammates: 0 },
              achievements: [],
              rating: 0,
              reviewCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  return (
    <AuthContext.Provider value={{ isReady: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
