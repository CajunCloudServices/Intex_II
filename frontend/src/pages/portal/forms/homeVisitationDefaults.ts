import type { CaseConferenceRequest, HomeVisitationRequest } from '../../../api/types';

export function createVisitationForm(residentId?: number): HomeVisitationRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    residentId: residentId ?? 1,
    visitDate: today,
    socialWorker: '',
    visitType: 'Routine Follow-Up',
    locationVisited: '',
    familyMembersPresent: '',
    purpose: '',
    observations: '',
    familyCooperationLevel: 'Moderate',
    safetyConcernsNoted: false,
    followUpNeeded: false,
    followUpNotes: '',
    visitOutcome: '',
  };
}

export function createConferenceForm(residentId?: number): CaseConferenceRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    residentId: residentId ?? 1,
    conferenceDate: today,
    leadWorker: '',
    attendees: '',
    purpose: '',
    decisionsMade: '',
    followUpActions: '',
    nextReviewDate: '',
    status: 'Scheduled',
  };
}

export const visitTypeOptions = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
];
