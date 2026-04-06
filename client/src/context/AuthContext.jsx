import { createContext, useState, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/constants';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });

  const setSession = useCallback((accessToken, user) => {
    setAuth({ user, accessToken, isAuthenticated: true });
  }, []);

  const clearSession = useCallback(() => {
    setAuth({ user: null, accessToken: null, isAuthenticated: false });
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
};
