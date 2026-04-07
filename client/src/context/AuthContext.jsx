import { createContext, useState, useCallback } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });

  const normalizeUser = useCallback((user) => {
    if (!user) {
      return null;
    }

    const firstName = user.firstName || null;
    const lastName = user.lastName || null;
    const fullName = user.fullName || [firstName, lastName].filter(Boolean).join(' ').trim() || null;

    return {
      ...user,
      firstName,
      lastName,
      fullName,
    };
  }, []);

  const setSession = useCallback((accessToken, user) => {
    setAuth({ user: normalizeUser(user), accessToken, isAuthenticated: true });
  }, [normalizeUser]);

  const clearSession = useCallback(() => {
    setAuth({ user: null, accessToken: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
};
