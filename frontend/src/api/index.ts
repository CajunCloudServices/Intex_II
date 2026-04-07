import { apiRequest } from './client';
import type {
  AuthResponse,
  CaseConference,
  CaseConferenceRequest,
  DashboardSummary,
  Donation,
  DonationRequest,
  DonationTrends,
  HomeVisitation,
  HomeVisitationRequest,
  IncidentReport,
  IncidentReportRequest,
  OutreachPerformanceSummary,
  ProcessRecording,
  ProcessRecordingRequest,
  PublicImpactSnapshot,
  Resident,
  ResidentOutcomeSummary,
  ResidentRequest,
  ReintegrationSummary,
  Safehouse,
  SafehousePerformanceSummary,
  SafehouseRequest,
  Supporter,
  SupporterRequest,
  UserProfile,
} from './types';

export const api = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    apiRequest<UserProfile>('/auth/me', {
      token,
    }),

  publicImpact: () => apiRequest<PublicImpactSnapshot[]>('/public-impact'),

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

  residents: (token: string) =>
    apiRequest<Resident[]>('/residents', {
      token,
    }),

  createResident: (token: string, payload: ResidentRequest) =>
    apiRequest<Resident>('/residents', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateResident: (token: string, id: number, payload: ResidentRequest) =>
    apiRequest<Resident>(`/residents/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteResident: (token: string, id: number) =>
    apiRequest<void>(`/residents/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

  processRecordings: (token: string) =>
    apiRequest<ProcessRecording[]>('/process-recordings', {
      token,
    }),

  createProcessRecording: (token: string, payload: ProcessRecordingRequest) =>
    apiRequest<ProcessRecording>('/process-recordings', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateProcessRecording: (token: string, id: number, payload: ProcessRecordingRequest) =>
    apiRequest<ProcessRecording>(`/process-recordings/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteProcessRecording: (token: string, id: number) =>
    apiRequest<void>(`/process-recordings/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

  homeVisitations: (token: string) =>
    apiRequest<HomeVisitation[]>('/home-visitations', {
      token,
    }),

  createHomeVisitation: (token: string, payload: HomeVisitationRequest) =>
    apiRequest<HomeVisitation>('/home-visitations', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateHomeVisitation: (token: string, id: number, payload: HomeVisitationRequest) =>
    apiRequest<HomeVisitation>(`/home-visitations/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteHomeVisitation: (token: string, id: number) =>
    apiRequest<void>(`/home-visitations/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

  safehouses: (token: string) =>
    apiRequest<Safehouse[]>('/safehouses', {
      token,
    }),

  createSafehouse: (token: string, payload: SafehouseRequest) =>
    apiRequest<Safehouse>('/safehouses', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateSafehouse: (token: string, id: number, payload: SafehouseRequest) =>
    apiRequest<Safehouse>(`/safehouses/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteSafehouse: (token: string, id: number) =>
    apiRequest<void>(`/safehouses/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

  incidents: (token: string) =>
    apiRequest<IncidentReport[]>('/incidents', {
      token,
    }),

  createIncident: (token: string, payload: IncidentReportRequest) =>
    apiRequest<IncidentReport>('/incidents', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  updateIncident: (token: string, id: number, payload: IncidentReportRequest) =>
    apiRequest<IncidentReport>(`/incidents/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  deleteIncident: (token: string, id: number) =>
    apiRequest<void>(`/incidents/${id}?confirm=true`, {
      method: 'DELETE',
      token,
    }),

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
