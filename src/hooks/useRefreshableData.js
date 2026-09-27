import { useCallback, useEffect, useRef, useState } from 'react';

export function useRefreshableData(fetcher, dependencies = []) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [state, setState] = useState({ data: null, loading: true, refreshing: false, error: null, lastRefreshed: null });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: current.data === null, refreshing: current.data !== null, error: null }));
    try {
      const data = await fetcherRef.current();
      setState({ data, loading: false, refreshing: false, error: null, lastRefreshed: new Date() });
      return data;
    } catch (error) {
      setState((current) => ({ ...current, loading: false, refreshing: false, error }));
      throw error;
    }
  }, dependencies);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  return { ...state, refresh };
}
