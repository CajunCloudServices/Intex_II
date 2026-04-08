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

  auditLog: () => apiRequest<AuditEvent[]>('/audit-log'),

  dashboardSummary: () => apiRequest<DashboardSummary>('/dashboard/summary'),

  dashboardAnalytics: () => apiRequest<Record<string, unknown>>('/dashboard/analytics'),

  caseConferences: () => apiRequest<CaseConference[]>('/case-conferences'),

  createCaseConference: (payload: CaseConferenceRequest) =>
    apiRequest<CaseConference>('/case-conferences', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCaseConference: (id: number, payload: CaseConferenceRequest) =>
    apiRequest<CaseConference>(`/case-conferences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCaseConference: (id: number) =>
    apiRequest<void>(`/case-conferences/${id}?confirm=true`, {
      method: 'DELETE',
    }),
};
