import { createContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { PublicDonorRegisterRequest, UserProfile } from '../api/types';

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  registerDonor: (payload: {
    email: string;
    password: string;
    fullName: string;
    region: string;
    country: string;
    phone?: string | null;
  }) => Promise<UserProfile>;
  /** After Google redirect the session cookie is already set — refresh profile from the API. */
  refreshSession: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  authMessage: string | null;
  clearAuthMessage: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const userRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const profile = await api.me();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (!userRef.current) {
        return;
      }

      void (async () => {
        try {
          const profile = await api.me();
          setUser(profile);
        } catch {
          setUser(null);
          setAuthMessage('Your session expired. Please sign in again.');
        }
      })();
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
    loading,
    async login(email: string, password: string) {
      const response = await api.login(email, password);
      setUser(response.user);
      setAuthMessage(null);
      return response.user;
    },
    async registerDonor(payload: PublicDonorRegisterRequest) {
      const response = await api.registerDonor(payload);
      setUser(response.user);
      setAuthMessage(null);
      return response.user;
    },
    async refreshSession() {
      const profile = await api.me();
      setUser(profile);
      setAuthMessage(null);
      return profile;
    },
    async logout() {
      try {
        await api.logout();
      } catch {
        // Still clear local state if the network fails.
      }
      setUser(null);
      setAuthMessage(null);
    },
    authMessage,
    clearAuthMessage() {
      setAuthMessage(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
