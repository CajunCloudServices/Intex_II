import { apiRequest, buildApiUrl } from '../client';
import type { AuthProvidersResponse, AuthResponse, UserProfile } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  authProviders: () => apiRequest<AuthProvidersResponse>('/auth/providers'),

  googleLoginUrl: (returnUrl = '/portal') =>
    buildApiUrl(`/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`),

  me: (token: string) =>
    apiRequest<UserProfile>('/auth/me', {
      token,
    }),
};
