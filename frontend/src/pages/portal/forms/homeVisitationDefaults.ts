import type { CaseConference, CaseConferenceRequest, HomeVisitation, HomeVisitationRequest, Resident } from '../../../api/types';

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
    safetyConcernDetails: '',
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

export const familyCooperationOptions = [
  'Highly Cooperative',
  'Cooperative',
  'Moderate',
  'Resistant',
  'Unresponsive',
];

export const conferenceStatusOptions = [
  'Scheduled',
  'Completed',
  'Deferred',
];

export function buildWorkerOptions(
  residents: Resident[],
  visitations: HomeVisitation[] = [],
  conferences: CaseConference[] = [],
): string[] {
  return Array.from(
    new Set([
      ...residents.map((resident) => resident.assignedSocialWorker),
      ...visitations.map((visit) => visit.socialWorker),
      ...conferences.map((conference) => conference.leadWorker),
    ].filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

export function buildVisitLocationOptions(
  residents: Resident[],
  visitations: HomeVisitation[] = [],
): string[] {
  return Array.from(
    new Set([
      ...residents.map((resident) => resident.safehouseName),
      ...visitations.map((visit) => visit.locationVisited),
    ].filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}
