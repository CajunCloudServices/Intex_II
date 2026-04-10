import type { ProcessRecording, ProcessRecordingRequest, Resident } from '../../../api/types';

export function createRecordingForm(residentId?: number): ProcessRecordingRequest {
  const today = new Date().toISOString().slice(0, 10);
  return {
    residentId: residentId ?? 1,
    sessionDate: today,
    socialWorker: '',
    sessionType: 'Individual',
    sessionDurationMinutes: 60,
    emotionalStateObserved: '',
    emotionalStateEnd: '',
    sessionNarrative: '',
    interventionsApplied: '',
    followUpActions: '',
    progressNoted: false,
    concernsFlagged: false,
    referralMade: false,
    restrictedNotes: '',
  };
}

export function buildProcessRecordingWorkerOptions(
  residents: Resident[],
  recordings: ProcessRecording[] = [],
): string[] {
  return Array.from(
    new Set([
      ...residents.map((resident) => resident.assignedSocialWorker),
      ...recordings.map((recording) => recording.socialWorker),
    ].filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}
