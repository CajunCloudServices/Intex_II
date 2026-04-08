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
  TrendDeploymentSummary,
} from '../types';

export const reportsApi = {
  donationTrends: () => apiRequest<DonationTrends>('/reports/donation-trends'),

  residentOutcomes: () => apiRequest<ResidentOutcomeSummary>('/reports/resident-outcomes'),

  safehousePerformance: () => apiRequest<SafehousePerformanceSummary>('/reports/safehouse-performance'),

  reintegrationSummary: () => apiRequest<ReintegrationSummary>('/reports/reintegration-summary'),

  outreachPerformance: () => apiRequest<OutreachPerformanceSummary>('/reports/outreach-performance'),

  socialAnalytics: () => apiRequest<SocialAnalytics>('/reports/social-analytics'),

  socialPostAdvisor: (payload: SocialPostAdvisorRequest) =>
    apiRequest<SocialPostAdvisorPrediction>('/reports/social-post-advisor', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  counselingRiskSummary: (top = 15) =>
    apiRequest<CounselingRiskSummary>(`/reports/counseling-risk?top=${encodeURIComponent(String(top))}`),

  reintegrationRiskSummary: (top = 12) =>
    apiRequest<ReintegrationRiskSummary>(`/ml/reintegration-risk-summary?top=${encodeURIComponent(String(top))}`),

  trendDeployments: () => apiRequest<TrendDeploymentSummary>('/reports/trend-deployments'),
};
