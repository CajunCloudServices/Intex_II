import { apiRequest } from '../client';
import type {
  HomeVisitation,
  HomeVisitationRequest,
  IncidentReport,
  IncidentReportRequest,
  ProcessRecording,
  ProcessRecordingRequest,
  Resident,
  ResidentRequest,
  Safehouse,
  SafehouseRequest,
} from '../types';

export const caseManagementApi = {
  residents: () => apiRequest<Resident[]>('/residents'),

  createResident: (payload: ResidentRequest) =>
    apiRequest<Resident>('/residents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateResident: (id: number, payload: ResidentRequest) =>
    apiRequest<Resident>(`/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteResident: (id: number) =>
    apiRequest<void>(`/residents/${id}?confirm=true`, {
      method: 'DELETE',
    }),

  processRecordings: () => apiRequest<ProcessRecording[]>('/process-recordings'),

  createProcessRecording: (payload: ProcessRecordingRequest) =>
    apiRequest<ProcessRecording>('/process-recordings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProcessRecording: (id: number, payload: ProcessRecordingRequest) =>
    apiRequest<ProcessRecording>(`/process-recordings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProcessRecording: (id: number) =>
    apiRequest<void>(`/process-recordings/${id}?confirm=true`, {
      method: 'DELETE',
    }),

  homeVisitations: () => apiRequest<HomeVisitation[]>('/home-visitations'),

  createHomeVisitation: (payload: HomeVisitationRequest) =>
    apiRequest<HomeVisitation>('/home-visitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateHomeVisitation: (id: number, payload: HomeVisitationRequest) =>
    apiRequest<HomeVisitation>(`/home-visitations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteHomeVisitation: (id: number) =>
    apiRequest<void>(`/home-visitations/${id}?confirm=true`, {
      method: 'DELETE',
    }),

  safehouses: () => apiRequest<Safehouse[]>('/safehouses'),

  createSafehouse: (payload: SafehouseRequest) =>
    apiRequest<Safehouse>('/safehouses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSafehouse: (id: number, payload: SafehouseRequest) =>
    apiRequest<Safehouse>(`/safehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSafehouse: (id: number) =>
    apiRequest<void>(`/safehouses/${id}?confirm=true`, {
      method: 'DELETE',
    }),

  incidents: () => apiRequest<IncidentReport[]>('/incidents'),

  createIncident: (payload: IncidentReportRequest) =>
    apiRequest<IncidentReport>('/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateIncident: (id: number, payload: IncidentReportRequest) =>
    apiRequest<IncidentReport>(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteIncident: (id: number) =>
    apiRequest<void>(`/incidents/${id}?confirm=true`, {
      method: 'DELETE',
    }),
};
