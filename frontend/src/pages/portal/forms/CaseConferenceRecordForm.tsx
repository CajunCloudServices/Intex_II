import type { FormEvent } from 'react';
import type { CaseConferenceRequest } from '../../../api/types';
import { FormGrid, FormSection } from '../../../components/ui/FormPrimitives';

type Option = { value: number; label: string };

type CaseConferenceRecordFormProps = {
  conferenceForm: CaseConferenceRequest;
  setConferenceForm: React.Dispatch<React.SetStateAction<CaseConferenceRequest>>;
  residentOptions: Option[];
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
};

export function CaseConferenceRecordForm({
  conferenceForm,
  setConferenceForm,
  residentOptions,
  onSubmit,
  submitting,
  submitLabel,
}: CaseConferenceRecordFormProps) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormSection title="Conference details">
        <FormGrid>
          <label>
            <span>Resident</span>
            <select value={conferenceForm.residentId} onChange={(event) => setConferenceForm({ ...conferenceForm, residentId: Number(event.target.value) })}>
              {residentOptions.map((resident) => (
                <option key={resident.value} value={resident.value}>
                  {resident.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Conference date</span>
            <input type="date" value={conferenceForm.conferenceDate} onChange={(event) => setConferenceForm({ ...conferenceForm, conferenceDate: event.target.value })} required />
          </label>
          <label>
            <span>Lead worker</span>
            <input value={conferenceForm.leadWorker} onChange={(event) => setConferenceForm({ ...conferenceForm, leadWorker: event.target.value })} required />
          </label>
          <label>
            <span>Status</span>
            <select value={conferenceForm.status} onChange={(event) => setConferenceForm({ ...conferenceForm, status: event.target.value })}>
              <option>Scheduled</option>
              <option>Completed</option>
              <option>Deferred</option>
            </select>
          </label>
          <label>
            <span>Next review date</span>
            <input type="date" value={conferenceForm.nextReviewDate ?? ''} onChange={(event) => setConferenceForm({ ...conferenceForm, nextReviewDate: event.target.value })} />
          </label>
        </FormGrid>
      </FormSection>

      <FormSection title="Conference narrative">
        <label>
          <span>Attendees</span>
          <textarea value={conferenceForm.attendees} onChange={(event) => setConferenceForm({ ...conferenceForm, attendees: event.target.value })} rows={2} required />
        </label>
        <label>
          <span>Purpose</span>
          <textarea value={conferenceForm.purpose} onChange={(event) => setConferenceForm({ ...conferenceForm, purpose: event.target.value })} rows={3} required />
        </label>
        <label>
          <span>Decisions made</span>
          <textarea value={conferenceForm.decisionsMade} onChange={(event) => setConferenceForm({ ...conferenceForm, decisionsMade: event.target.value })} rows={4} required />
        </label>
        <label>
          <span>Follow-up actions</span>
          <textarea value={conferenceForm.followUpActions} onChange={(event) => setConferenceForm({ ...conferenceForm, followUpActions: event.target.value })} rows={4} required />
        </label>
      </FormSection>

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
