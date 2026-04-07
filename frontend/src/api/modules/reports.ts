import { apiRequest } from '../client';
import type {
  DonationTrends,
  OutreachPerformanceSummary,
  ReintegrationSummary,
  ResidentOutcomeSummary,
  SafehousePerformanceSummary,
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
};
