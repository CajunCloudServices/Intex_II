import { apiRequest } from '../client';
import type {
  AuditEvent,
  CaseConference,
  CaseConferenceRequest,
  DashboardSummary,
  PublicImpactSnapshot,
} from '../types';

export const dashboardApi = {
  publicImpact: () => apiRequest<PublicImpactSnapshot[]>('/public-impact'),

  auditLog: (token: string) =>
    apiRequest<AuditEvent[]>('/audit-log', {
      token,
    }),

  dashboardSummary: (token: string) =>
    apiRequest<DashboardSummary>('/dashboard/summary', {
      token,
    }),

  dashboardAnalytics: (token: string) =>
    apiRequest<Record<string, unknown>>('/dashboard/analytics', {
      token,
    }),

  caseConferences: (token: string) =>
    apiRequest<CaseConference[]>('/case-conferences', {
      token,
    }),

  createCaseConference: (token: string, payload: CaseConferenceRequest) =>
    apiRequest<CaseConference>('/case-conferences', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateCaseConference: (token: string, id: number, payload: CaseConferenceRequest) =>
    apiRequest<CaseConference>(`/case-conferences/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteCaseConference: (token: string, id: number) =>
    apiRequest<void>(`/case-conferences/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),
};
