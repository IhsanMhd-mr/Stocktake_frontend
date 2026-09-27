import { useEffect, useRef } from 'react';

export function useRealtimeRefresh(lastEvent, shouldRefresh, refresh, delay = 250) {
  const timer = useRef(null);
  const predicate = useRef(shouldRefresh);
  predicate.current = shouldRefresh;

  useEffect(() => {
    if (!lastEvent || !predicate.current(lastEvent)) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => refresh().catch(() => {}), delay);
    return () => clearTimeout(timer.current);
  }, [lastEvent, refresh, delay]);
}
