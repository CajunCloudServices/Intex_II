import type { ProcessRecordingRequest } from '../../../api/types';

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
