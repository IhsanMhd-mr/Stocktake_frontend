import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/useAuth.js';
import { RealtimeContext } from './RealtimeContext.js';

const envUrl = import.meta.env.VITE_API_URL;
const SOCKET_URL = envUrl ? envUrl.replace(/\/$/, '') : window.location.origin;
const realtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME !== 'false';

export function RealtimeProvider({ children }) {
  const { token, user, restoring } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const isAdmin = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  useEffect(() => {
    if (restoring || !token || !isAdmin || !realtimeEnabled) return undefined;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('data-changed', (event) => setLastEvent({ ...event, receivedAt: Date.now() }));
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setLastEvent(null);
    };
  }, [token, isAdmin, restoring]);

  const value = useMemo(() => ({ connected, lastEvent }), [connected, lastEvent]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
