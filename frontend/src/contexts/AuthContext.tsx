import { createContext, useEffect, useState } from 'react';
import { api } from '../api';
import type { UserProfile } from '../api/types';

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  completeGoogleLogin: (token: string) => Promise<UserProfile>;
  logout: () => void;
  authMessage: string | null;
  clearAuthMessage: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'intex.jwt';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The provider restores a saved JWT on refresh, fetches /auth/me once, and then keeps the
  // rest of the app focused on business logic instead of session bookkeeping.
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const applySession = async (jwt: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, jwt);
    setToken(jwt);
    const profile = await api.me(jwt);
    setUser(profile);
    setAuthMessage(null);
    return profile;
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await api.me(token);
        setUser(profile);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setAuthMessage('Your session expired. Please sign in again.');
    };

    const handleForbidden = () => {
      setAuthMessage('You do not have permission to open that page.');
    };

    window.addEventListener('intex:unauthorized', handleUnauthorized);
    window.addEventListener('intex:forbidden', handleForbidden);

    return () => {
      window.removeEventListener('intex:unauthorized', handleUnauthorized);
      window.removeEventListener('intex:forbidden', handleForbidden);
    };
  }, []);

  const value = {
    user,
    token,
    loading,
    async login(email: string, password: string) {
      const response = await api.login(email, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      setAuthMessage(null);
      return response.user;
    },
    async completeGoogleLogin(jwt: string) {
      try {
        return await applySession(jwt);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
        throw new Error('Google sign-in succeeded, but the session could not be completed.');
      }
    },
    logout() {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
    },
    authMessage,
    clearAuthMessage() {
      setAuthMessage(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
