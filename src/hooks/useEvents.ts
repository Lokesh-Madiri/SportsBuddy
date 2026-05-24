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
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents({ limitCount: 20 });
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    }
  }, []);

  return { events, isLoading, error, refresh };
}
