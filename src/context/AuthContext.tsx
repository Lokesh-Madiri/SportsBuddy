import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';

interface AuthContextValue {
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isReady: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore();
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        logout();
        return;
      }

      try {
        const profile = await authService.ensureUserProfile(firebaseUser);
        setUser(profile);
      } catch (error) {
        console.error('[AuthContext] Error loading Firebase user profile:', error);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [logout, setLoading, setUser]);

  return (
    <AuthContext.Provider value={{ isReady: !isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
