import type { FormEvent } from 'react';
import type { ProcessRecordingRequest, Resident } from '../../../api/types';
import { CheckboxField, FormGrid, FormSection } from '../../../components/ui/FormPrimitives';

const SESSION_TYPE_OPTIONS = ['Individual', 'Group'] as const;
const EMOTIONAL_STATE_OPTIONS = ['Calm', 'Anxious', 'Sad', 'Angry', 'Hopeful', 'Withdrawn', 'Happy', 'Distressed'] as const;

type ProcessRecordingFormProps = {
  recordingForm: ProcessRecordingRequest;
  setRecordingForm: React.Dispatch<React.SetStateAction<ProcessRecordingRequest>>;
  residents: Resident[];
  socialWorkerOptions?: string[];
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
  showRestrictedNotes?: boolean;
};

export function ProcessRecordingForm({
  recordingForm,
  setRecordingForm,
  residents,
  socialWorkerOptions = [],
  onSubmit,
  submitting,
  submitLabel,
  showRestrictedNotes = true,
}: ProcessRecordingFormProps) {
  const workerOptions =
    socialWorkerOptions.includes(recordingForm.socialWorker) || !recordingForm.socialWorker
      ? socialWorkerOptions
      : [recordingForm.socialWorker, ...socialWorkerOptions];

  return (
    <form className="stack-form" onSubmit={onSubmit} noValidate>
      <FormSection title="Session metadata">
        <FormGrid>
          <label>
            <span>Resident</span>
            <select value={recordingForm.residentId} onChange={(event) => setRecordingForm({ ...recordingForm, residentId: Number(event.target.value) })}>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.caseControlNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Session date</span>
            <input type="date" value={recordingForm.sessionDate} onChange={(event) => setRecordingForm({ ...recordingForm, sessionDate: event.target.value })} required />
          </label>
          <label>
            <span>Social worker</span>
            <select value={recordingForm.socialWorker} onChange={(event) => setRecordingForm({ ...recordingForm, socialWorker: event.target.value })} required>
              <option value="" disabled>
                Select social worker
              </option>
              {workerOptions.map((worker) => (
                <option key={worker} value={worker}>
                  {worker}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Session type</span>
            <select value={recordingForm.sessionType} onChange={(event) => setRecordingForm({ ...recordingForm, sessionType: event.target.value })} required>
              {SESSION_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Duration (minutes)</span>
            <input type="number" min="1" value={recordingForm.sessionDurationMinutes} onChange={(event) => setRecordingForm({ ...recordingForm, sessionDurationMinutes: Number(event.target.value) })} required />
          </label>
          <label>
            <span>Observed state</span>
            <select value={recordingForm.emotionalStateObserved} onChange={(event) => setRecordingForm({ ...recordingForm, emotionalStateObserved: event.target.value })} required>
              <option value="" disabled>
                Select emotional state
              </option>
              {EMOTIONAL_STATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>End state</span>
            <select value={recordingForm.emotionalStateEnd} onChange={(event) => setRecordingForm({ ...recordingForm, emotionalStateEnd: event.target.value })} required>
              <option value="" disabled>
                Select emotional state
              </option>
              {EMOTIONAL_STATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </FormGrid>
      </FormSection>

      <FormSection title="Session narrative">
        <label>
          <span>Narrative</span>
          <textarea value={recordingForm.sessionNarrative} onChange={(event) => setRecordingForm({ ...recordingForm, sessionNarrative: event.target.value })} rows={4} required />
        </label>
        <FormGrid>
          <label>
            <span>Interventions applied</span>
            <textarea value={recordingForm.interventionsApplied} onChange={(event) => setRecordingForm({ ...recordingForm, interventionsApplied: event.target.value })} rows={3} required />
          </label>
          <label>
            <span>Follow-up actions</span>
            <textarea value={recordingForm.followUpActions} onChange={(event) => setRecordingForm({ ...recordingForm, followUpActions: event.target.value })} rows={3} required />
          </label>
        </FormGrid>
      </FormSection>

      <div className="check-grid">
        <CheckboxField label="Progress noted" checked={recordingForm.progressNoted} onChange={(checked) => setRecordingForm({ ...recordingForm, progressNoted: checked })} />
        <CheckboxField label="Concerns flagged" checked={recordingForm.concernsFlagged} onChange={(checked) => setRecordingForm({ ...recordingForm, concernsFlagged: checked })} />
        <CheckboxField label="Referral made" checked={recordingForm.referralMade} onChange={(checked) => setRecordingForm({ ...recordingForm, referralMade: checked })} />
      </div>

      {showRestrictedNotes ? (
        <label>
          <span>Restricted notes</span>
          <textarea value={recordingForm.restrictedNotes ?? ''} onChange={(event) => setRecordingForm({ ...recordingForm, restrictedNotes: event.target.value })} rows={3} />
        </label>
      ) : null}

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
