import type { FormEvent } from 'react';
import type { HomeVisitationRequest } from '../../../api/types';
import { CheckboxField, FormGrid, FormSection } from '../../../components/ui/FormPrimitives';
import { visitTypeOptions } from './homeVisitationDefaults';

type Option = { value: number; label: string };

type HomeVisitationRecordFormProps = {
  visitationForm: HomeVisitationRequest;
  setVisitationForm: React.Dispatch<React.SetStateAction<HomeVisitationRequest>>;
  residentOptions: Option[];
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
};

export function HomeVisitationRecordForm({
  visitationForm,
  setVisitationForm,
  residentOptions,
  onSubmit,
  submitting,
  submitLabel,
}: HomeVisitationRecordFormProps) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormSection title="Visit details">
        <FormGrid>
          <label>
            <span>Resident</span>
            <select value={visitationForm.residentId} onChange={(event) => setVisitationForm({ ...visitationForm, residentId: Number(event.target.value) })}>
              {residentOptions.map((resident) => (
                <option key={resident.value} value={resident.value}>
                  {resident.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Visit date</span>
            <input type="date" value={visitationForm.visitDate} onChange={(event) => setVisitationForm({ ...visitationForm, visitDate: event.target.value })} required />
          </label>
          <label>
            <span>Social worker</span>
            <input value={visitationForm.socialWorker} onChange={(event) => setVisitationForm({ ...visitationForm, socialWorker: event.target.value })} required />
          </label>
          <label>
            <span>Visit type</span>
            <select value={visitationForm.visitType} onChange={(event) => setVisitationForm({ ...visitationForm, visitType: event.target.value })}>
              {visitTypeOptions.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Location visited</span>
            <input value={visitationForm.locationVisited} onChange={(event) => setVisitationForm({ ...visitationForm, locationVisited: event.target.value })} required />
          </label>
          <label>
            <span>Family members present</span>
            <input value={visitationForm.familyMembersPresent} onChange={(event) => setVisitationForm({ ...visitationForm, familyMembersPresent: event.target.value })} required />
          </label>
          <label>
            <span>Family cooperation</span>
            <input value={visitationForm.familyCooperationLevel} onChange={(event) => setVisitationForm({ ...visitationForm, familyCooperationLevel: event.target.value })} required />
          </label>
          <label>
            <span>Visit outcome</span>
            <input value={visitationForm.visitOutcome} onChange={(event) => setVisitationForm({ ...visitationForm, visitOutcome: event.target.value })} required />
          </label>
        </FormGrid>
      </FormSection>

      <FormSection title="Observations and actions">
        <label>
          <span>Purpose</span>
          <textarea value={visitationForm.purpose} onChange={(event) => setVisitationForm({ ...visitationForm, purpose: event.target.value })} rows={3} required />
        </label>
        <label>
          <span>Observations</span>
          <textarea value={visitationForm.observations} onChange={(event) => setVisitationForm({ ...visitationForm, observations: event.target.value })} rows={4} required />
        </label>
      </FormSection>

      <div className="check-grid">
        <CheckboxField label="Safety concerns noted" checked={visitationForm.safetyConcernsNoted} onChange={(checked) => setVisitationForm({ ...visitationForm, safetyConcernsNoted: checked })} />
        <CheckboxField label="Follow-up needed" checked={visitationForm.followUpNeeded} onChange={(checked) => setVisitationForm({ ...visitationForm, followUpNeeded: checked })} />
      </div>

      <label>
        <span>Follow-up notes</span>
        <textarea value={visitationForm.followUpNotes ?? ''} onChange={(event) => setVisitationForm({ ...visitationForm, followUpNotes: event.target.value })} rows={3} />
      </label>

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
