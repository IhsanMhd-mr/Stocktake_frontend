import { createContext, useContext } from 'react';

export const RealtimeContext = createContext({ connected: false, lastEvent: null });
export function useRealtime() { return useContext(RealtimeContext); }
