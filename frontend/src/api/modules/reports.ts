import { apiRequest } from '../client';
import type {
  CounselingRiskSummary,
  DonationTrends,
  OutreachPerformanceSummary,
  ReintegrationRiskSummary,
  ReintegrationSummary,
  ResidentOutcomeSummary,
  SafehousePerformanceSummary,
  SocialAnalytics,
  SocialPostAdvisorPrediction,
  SocialPostAdvisorRequest,
} from '../types';

export const reportsApi = {
  donationTrends: (token: string) =>
    apiRequest<DonationTrends>('/reports/donation-trends', {
      token,
    }),

  residentOutcomes: (token: string) =>
    apiRequest<ResidentOutcomeSummary>('/reports/resident-outcomes', {
      token,
    }),

  safehousePerformance: (token: string) =>
    apiRequest<SafehousePerformanceSummary>('/reports/safehouse-performance', {
      token,
    }),

  reintegrationSummary: (token: string) =>
    apiRequest<ReintegrationSummary>('/reports/reintegration-summary', {
      token,
    }),

  outreachPerformance: (token: string) =>
    apiRequest<OutreachPerformanceSummary>('/reports/outreach-performance', {
      token,
    }),

  socialAnalytics: (token: string) =>
    apiRequest<SocialAnalytics>('/reports/social-analytics', {
      token,
    }),

  socialPostAdvisor: (token: string, payload: SocialPostAdvisorRequest) =>
    apiRequest<SocialPostAdvisorPrediction>('/reports/social-post-advisor', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  counselingRiskSummary: (token: string, top = 15) =>
    apiRequest<CounselingRiskSummary>(`/reports/counseling-risk?top=${encodeURIComponent(String(top))}`, {
      token,
    }),

  reintegrationRiskSummary: (token: string, top = 12) =>
    apiRequest<ReintegrationRiskSummary>(`/ml/reintegration-risk-summary?top=${encodeURIComponent(String(top))}`, {
      token,
    }),
};
