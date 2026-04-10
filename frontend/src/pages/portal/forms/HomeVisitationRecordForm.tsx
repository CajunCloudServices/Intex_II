import type { FormEvent } from 'react';
import type { HomeVisitationRequest } from '../../../api/types';
import { CheckboxField, FormGrid, FormSection, ValidatedSelectField, ValidatedTextField, ValidatedTextareaField } from '../../../components/ui/FormPrimitives';
import { familyCooperationOptions, visitTypeOptions } from './homeVisitationDefaults';

type Option = { value: number; label: string };

export type HomeVisitationFieldErrors = Partial<Record<
  | 'residentId'
  | 'visitDate'
  | 'socialWorker'
  | 'visitType'
  | 'locationVisited'
  | 'familyMembersPresent'
  | 'familyCooperationLevel'
  | 'visitOutcome'
  | 'purpose'
  | 'observations'
  | 'safetyConcernDetails'
  | 'followUpNotes',
  string
>>;

type HomeVisitationRecordFormProps = {
  visitationForm: HomeVisitationRequest;
  setVisitationForm: React.Dispatch<React.SetStateAction<HomeVisitationRequest>>;
  residentOptions: Option[];
  workerOptions: string[];
  locationOptions: string[];
  fieldErrors?: HomeVisitationFieldErrors;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  submitLabel: string;
};

export function HomeVisitationRecordForm({
  visitationForm,
  setVisitationForm,
  residentOptions,
  workerOptions,
  locationOptions,
  fieldErrors,
  onSubmit,
  submitting,
  submitLabel,
}: HomeVisitationRecordFormProps) {
  const availableWorkers = workerOptions.includes(visitationForm.socialWorker)
    ? workerOptions
    : visitationForm.socialWorker
      ? [visitationForm.socialWorker, ...workerOptions]
      : workerOptions;
  const availableLocations = locationOptions.includes(visitationForm.locationVisited)
    ? locationOptions
    : visitationForm.locationVisited
      ? [visitationForm.locationVisited, ...locationOptions]
      : locationOptions;

  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <FormSection title="Visit details">
        <FormGrid>
          <ValidatedSelectField
            label="Resident"
            required
            error={fieldErrors?.residentId}
            value={visitationForm.residentId}
            onChange={(event) => setVisitationForm({ ...visitationForm, residentId: Number(event.target.value) })}
          >
            {residentOptions.map((resident) => (
              <option key={resident.value} value={resident.value}>
                {resident.label}
              </option>
            ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Visit date"
            id="visit-date"
            type="date"
            required
            error={fieldErrors?.visitDate}
            value={visitationForm.visitDate}
            onChange={(event) => setVisitationForm({ ...visitationForm, visitDate: event.target.value })}
          />
          <ValidatedSelectField
            label="Social worker"
            required
            error={fieldErrors?.socialWorker}
            value={visitationForm.socialWorker}
            onChange={(event) => setVisitationForm({ ...visitationForm, socialWorker: event.target.value })}
          >
              <option value="">Select a worker</option>
              {availableWorkers.map((worker) => (
                <option key={worker} value={worker}>
                  {worker}
                </option>
              ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Visit type"
            required
            error={fieldErrors?.visitType}
            value={visitationForm.visitType}
            onChange={(event) => setVisitationForm({ ...visitationForm, visitType: event.target.value })}
          >
              {visitTypeOptions.map((type) => (
                <option key={type}>{type}</option>
              ))}
          </ValidatedSelectField>
          <ValidatedSelectField
            label="Location visited"
            required
            error={fieldErrors?.locationVisited}
            value={visitationForm.locationVisited}
            onChange={(event) => setVisitationForm({ ...visitationForm, locationVisited: event.target.value })}
          >
              <option value="">Select a location</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Family members present"
            required
            error={fieldErrors?.familyMembersPresent}
            value={visitationForm.familyMembersPresent}
            onChange={(event) => setVisitationForm({ ...visitationForm, familyMembersPresent: event.target.value })}
          />
          <ValidatedSelectField
            label="Family cooperation"
            required
            error={fieldErrors?.familyCooperationLevel}
            value={visitationForm.familyCooperationLevel}
            onChange={(event) => setVisitationForm({ ...visitationForm, familyCooperationLevel: event.target.value })}
          >
              {familyCooperationOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
          </ValidatedSelectField>
          <ValidatedTextField
            label="Visit outcome"
            required
            error={fieldErrors?.visitOutcome}
            value={visitationForm.visitOutcome}
            onChange={(event) => setVisitationForm({ ...visitationForm, visitOutcome: event.target.value })}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Observations and actions">
        <ValidatedTextareaField
          label="Purpose"
          rows={3}
          error={fieldErrors?.purpose}
          value={visitationForm.purpose}
          onChange={(event) => setVisitationForm({ ...visitationForm, purpose: event.target.value })}
        />
        <ValidatedTextareaField
          label="Observations"
          required
          rows={4}
          error={fieldErrors?.observations}
          value={visitationForm.observations}
          onChange={(event) => setVisitationForm({ ...visitationForm, observations: event.target.value })}
        />
      </FormSection>

      <div className="check-grid">
        <CheckboxField label="Safety concerns noted" checked={visitationForm.safetyConcernsNoted} onChange={(checked) => setVisitationForm({ ...visitationForm, safetyConcernsNoted: checked, safetyConcernDetails: checked ? visitationForm.safetyConcernDetails : '' })} />
        <CheckboxField label="Follow-up needed" checked={visitationForm.followUpNeeded} onChange={(checked) => setVisitationForm({ ...visitationForm, followUpNeeded: checked, followUpNotes: checked ? visitationForm.followUpNotes : '' })} />
      </div>

      {visitationForm.safetyConcernsNoted ? (
        <ValidatedTextareaField
          label="Describe the safety concern"
          required
          rows={3}
          error={fieldErrors?.safetyConcernDetails}
          value={visitationForm.safetyConcernDetails}
          onChange={(event) => setVisitationForm({ ...visitationForm, safetyConcernDetails: event.target.value })}
          placeholder="Describe the specific concern observed..."
        />
      ) : null}

      <ValidatedTextareaField
        label="Follow-up notes"
        required={visitationForm.followUpNeeded}
        rows={3}
        error={fieldErrors?.followUpNotes}
        value={visitationForm.followUpNotes ?? ''}
        onChange={(event) => setVisitationForm({ ...visitationForm, followUpNotes: event.target.value })}
      />

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
