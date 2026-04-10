import { createContext } from 'react';
import type { PublicDonorRegisterRequest, UserProfile } from '../api/types';

export type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  registerDonor: (payload: PublicDonorRegisterRequest) => Promise<UserProfile>;
  refreshSession: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  authMessage: string | null;
  clearAuthMessage: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
