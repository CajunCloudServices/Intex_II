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
};
