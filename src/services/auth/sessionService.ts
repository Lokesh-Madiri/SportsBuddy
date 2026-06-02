import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@sportsbuddy_firebase_session';

export const sessionService = {
  async saveSession(uid: string): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ uid, savedAt: Date.now() }));
  },

  async getSession(): Promise<{ uid: string; savedAt: number } | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { uid: string; savedAt: number };
    } catch {
      await this.clearSession();
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};
