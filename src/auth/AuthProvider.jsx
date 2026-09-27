import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api.js';
import { configureApiClient } from '../api/api-client.js';
import { AuthContext } from './AuthContext.js';

const TOKEN_KEY = 'stockroom_access_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  configureApiClient({ getToken: () => token, onUnauthorized: clearSession });

  useEffect(() => {
    let active = true;
    if (!token) {
      setRestoring(false);
      return () => { active = false; };
    }
    setRestoring(true);
    authApi.me()
      .then(({ user: verifiedUser }) => { if (active) setUser(verifiedUser); })
      .catch(() => { if (active) clearSession(); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [token, clearSession]);

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    configureApiClient({ getToken: () => response.token, onUnauthorized: clearSession });
    const { user: verifiedUser } = await authApi.me();
    setUser(verifiedUser);
    setRestoring(false);
    return verifiedUser;
  }, [clearSession]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* Local logout must always succeed. */ }
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ token, user, restoring, login, logout }), [token, user, restoring, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
