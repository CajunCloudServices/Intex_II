import { apiRequest } from '../client';
import type {
  Donation,
  DonationRequest,
  Supporter,
  SupporterRequest,
} from '../types';

export const donorApi = {
  supporters: (token: string) =>
    apiRequest<Supporter[]>('/supporters', {
      token,
    }),

  createSupporter: (token: string, payload: SupporterRequest) =>
    apiRequest<Supporter>('/supporters', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateSupporter: (token: string, id: number, payload: SupporterRequest) =>
    apiRequest<Supporter>(`/supporters/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteSupporter: (token: string, id: number) =>
    apiRequest<void>(`/supporters/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

  donations: (token: string) =>
    apiRequest<Donation[]>('/donations', {
      token,
    }),

  createDonation: (token: string, payload: DonationRequest) =>
    apiRequest<Donation>('/donations', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateDonation: (token: string, id: number, payload: DonationRequest) =>
    apiRequest<Donation>(`/donations/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteDonation: (token: string, id: number) =>
    apiRequest<void>(`/donations/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

  donorHistory: (token: string) =>
    apiRequest<Donation[]>('/donations/my-history', {
      token,
    }),
};
