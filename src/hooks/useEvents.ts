import { useEffect, useCallback } from 'react';
import { subscribeToEvents, getEvents } from '../firebase/firestore';
import { useEventsStore } from '../store/eventsStore';

export function useEvents() {
  const { events, isLoading, error, setEvents, setLoading, setError } = useEventsStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToEvents((liveEvents) => {
      setEvents(liveEvents);
    });
    return unsubscribe;
    // setLoading and setEvents are stable Zustand actions — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents({ limitCount: 20 });
      setEvents(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
    }
    // setLoading, setEvents, setError are stable Zustand actions — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, isLoading, error, refresh };
}
