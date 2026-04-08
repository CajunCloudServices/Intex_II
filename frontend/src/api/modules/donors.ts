import { apiRequest } from '../client';
import type {
  Donation,
  DonorChurnRiskSummary,
  DonationImpactPrediction,
  DonationRequest,
  PublicDonationSubmissionRequest,
  PublicDonationSubmissionResponse,
  DonorAllocationBreakdown,
  DonorImpactSummary,
  Supporter,
  SupporterRequest,
} from '../types';

export const donorApi = {
  supporters: () => apiRequest<Supporter[]>('/supporters'),

  createSupporter: (payload: SupporterRequest) =>
    apiRequest<Supporter>('/supporters', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSupporter: (id: number, payload: SupporterRequest) =>
    apiRequest<Supporter>(`/supporters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSupporter: (id: number) =>
    apiRequest<void>(`/supporters/${id}?confirm=true`, {
      method: 'DELETE',
    }),

  donations: () => apiRequest<Donation[]>('/donations'),

  createDonation: (payload: DonationRequest) =>
    apiRequest<Donation>('/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDonation: (id: number, payload: DonationRequest) =>
    apiRequest<Donation>(`/donations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteDonation: (id: number) =>
    apiRequest<void>(`/donations/${id}?confirm=true`, {
      method: 'DELETE',
    }),

  donorHistory: () => apiRequest<Donation[]>('/donations/my-history'),

  donorImpactSummary: () => apiRequest<DonorImpactSummary>('/donations/my-impact-summary'),

  donorAllocationBreakdown: () => apiRequest<DonorAllocationBreakdown>('/donations/my-allocation-breakdown'),

  donorImpactPrediction: (amount: number) =>
    apiRequest<DonationImpactPrediction>(`/donations/predict-impact?amount=${encodeURIComponent(String(amount))}`),

  submitPublicDonation: (payload: PublicDonationSubmissionRequest) =>
    apiRequest<PublicDonationSubmissionResponse>('/donations/public-submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  donorChurnRiskSummary: (top = 15) =>
    apiRequest<DonorChurnRiskSummary>(`/supporters/churn-risk-summary?top=${encodeURIComponent(String(top))}`),
};
